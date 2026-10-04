import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CI = Tables<"cmdb_ci">;
export type Rel = Tables<"cmdb_relationship">;

export const TECH_CLASSES = ["server", "database", "network_device", "storage", "vm", "cloud", "middleware", "other"] as const;
export const CLASS_LABEL: Record<string, string> = {
  business_service: "Business Service",
  sub_business_service: "Sub-Business Service",
  system: "System / Application",
  it_component: "IT Component",
  server: "Server",
  database: "Database",
  network_device: "Network Device",
  storage: "Storage",
  vm: "Virtual Machine",
  cloud: "Cloud Resource",
  middleware: "Middleware",
  other: "Other Technology",
  vlan: "VLAN",
  subnet: "Subnet",
};
export const isTech = (c: CI) => (TECH_CLASSES as readonly string[]).includes(c.ci_class);
export const hasOwner = (c: CI) => !!(c.business_owner?.trim() || c.technical_owner?.trim());
export const ownerStatus = (c: CI) => {
  const b = !!c.business_owner?.trim();
  const t = !!c.technical_owner?.trim();
  return b && t ? "Complete" : b || t ? "Incomplete" : "Unowned";
};

const KEY = ["cmdb"];

async function fetchCmdb() {
  const [ci, rel] = await Promise.all([
    supabase.from("cmdb_ci").select("*").order("name"),
    supabase.from("cmdb_relationship").select("*"),
  ]);
  if (ci.error) throw ci.error;
  if (rel.error) throw rel.error;
  return { cis: ci.data ?? [], rels: rel.data ?? [] };
}

/** Reactive CMDB data: refetches whenever any CI or relationship row changes. */
export function useCmdb() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: fetchCmdb });
  useEffect(() => {
    const ch = supabase
      .channel("cmdb-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "cmdb_ci" }, () => qc.invalidateQueries({ queryKey: KEY }))
      .on("postgres_changes", { event: "*", schema: "public", table: "cmdb_relationship" }, () => qc.invalidateQueries({ queryKey: KEY }))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
  const model = useMemo(() => (q.data ? buildModel(q.data.cis, q.data.rels) : null), [q.data]);
  return { ...q, model };
}

export async function updateOwners(id: string, business_owner: string | null, technical_owner: string | null, qc: ReturnType<typeof useQueryClient>) {
  const { error } = await supabase.from("cmdb_ci").update({ business_owner, technical_owner }).eq("id", id);
  if (error) throw error;
  await qc.invalidateQueries({ queryKey: KEY });
}

export type Model = ReturnType<typeof buildModel>;

export function buildModel(cis: CI[], rels: Rel[]) {
  const byId = new Map(cis.map((c) => [c.id, c]));
  const out = new Map<string, Rel[]>();
  const inn = new Map<string, Rel[]>();
  for (const r of rels) {
    (out.get(r.source_id) ?? out.set(r.source_id, []).get(r.source_id)!).push(r);
    (inn.get(r.target_id) ?? inn.set(r.target_id, []).get(r.target_id)!).push(r);
  }
  const children = (id: string, layer = "business") =>
    (out.get(id) ?? []).filter((r) => r.layer === layer).map((r) => byId.get(r.target_id)!).filter(Boolean);
  const parents = (id: string, layer = "business") =>
    (inn.get(id) ?? []).filter((r) => r.layer === layer).map((r) => byId.get(r.source_id)!).filter(Boolean);

  /** Walk graph in one direction and collect all reachable CIs */
  const walk = (id: string, dir: "up" | "down", layers?: string[]) => {
    const seen = new Set<string>([id]);
    const res: { ci: CI; via: Rel; depth: number }[] = [];
    let frontier = [id];
    let depth = 1;
    while (frontier.length && depth < 8) {
      const next: string[] = [];
      for (const f of frontier) {
        const edges = (dir === "down" ? out.get(f) : inn.get(f)) ?? [];
        for (const e of edges) {
          if (layers && !layers.includes(e.layer)) continue;
          const nid = dir === "down" ? e.target_id : e.source_id;
          if (seen.has(nid)) continue;
          seen.add(nid);
          const c = byId.get(nid);
          if (c) {
            res.push({ ci: c, via: e, depth });
            next.push(nid);
          }
        }
      }
      frontier = next;
      depth++;
    }
    return res;
  };

  /** Business context (ancestors) for any CI, derived from business-layer relationships */
  const context = (id: string) => {
    const up = walk(id, "up", ["business"]).map((x) => x.ci);
    const pick = (cls: string) => up.filter((c) => c.ci_class === cls).map((c) => c.name);
    return {
      businessServices: pick("business_service"),
      subServices: pick("sub_business_service"),
      systems: pick("system"),
      technology: up.filter(isTech).map((c) => c.name),
    };
  };
  const ctx = new Map(cis.map((c) => [c.id, context(c.id)]));

  const assets = cis.filter(isTech);

  // ownership
  const owned = assets.filter(hasOwner);
  const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
  const ownership = {
    total: assets.length,
    owned: owned.length,
    unowned: assets.length - owned.length,
    coverage: pct(owned.length, assets.length),
    bizCoverage: pct(assets.filter((a) => a.business_owner?.trim()).length, assets.length),
    techCoverage: pct(assets.filter((a) => a.technical_owner?.trim()).length, assets.length),
    criticalUnowned: assets.filter((a) => !hasOwner(a) && a.criticality === "Critical").length,
    incomplete: assets.filter((a) => ownerStatus(a) === "Incomplete").length,
  };
  const byType = Object.entries(
    assets.reduce<Record<string, { total: number; owned: number }>>((acc, a) => {
      const k = CLASS_LABEL[a.ci_class] ?? a.ci_class;
      acc[k] ??= { total: 0, owned: 0 };
      acc[k].total++;
      if (hasOwner(a)) acc[k].owned++;
      return acc;
    }, {}),
  )
    .map(([type, v]) => ({ type, ...v, unowned: v.total - v.owned, coverage: pct(v.owned, v.total) }))
    .sort((a, b) => b.total - a.total);

  // mapping completeness
  type Check = { ci: CI; ok: boolean; missing: string[] };
  const checks: Record<string, Check[]> = { bs: [], sbs: [], sys: [], comp: [], asset: [] };
  for (const c of cis) {
    const kids = children(c.id);
    if (c.ci_class === "business_service") {
      const ok = kids.some((k) => k.ci_class === "sub_business_service");
      checks.bs.push({ ci: c, ok, missing: ok ? [] : ["Sub-Business Service relationship"] });
    } else if (c.ci_class === "sub_business_service") {
      const m: string[] = [];
      if (!kids.some((k) => k.ci_class === "system")) m.push("System relationship");
      if (!parents(c.id).some((p) => p.ci_class === "business_service")) m.push("Parent Business Service");
      checks.sbs.push({ ci: c, ok: !m.length, missing: m });
    } else if (c.ci_class === "system") {
      const m: string[] = [];
      const tech = kids.filter(isTech);
      if (!tech.length) m.push("Technology Layer Asset relationship");
      else if (!tech.some((k) => k.ci_class === "database" || children(k.id).some((a) => a.ci_class === "database")))
        m.push("Database relationship");
      if (!parents(c.id).some((p) => p.ci_class === "sub_business_service")) m.push("Sub-Business Service relationship");
      checks.sys.push({ ci: c, ok: !m.length, missing: m });
    } else if (isTech(c) && !c.device_role) {
      const ok = ctx.get(c.id)!.systems.length > 0;
      checks.asset.push({ ci: c, ok, missing: ok ? [] : ["Related System"] });
    }
  }
  const rate = (arr: Check[]) => pct(arr.filter((x) => x.ok).length, arr.length);
  const allChecks = Object.values(checks).flat();
  const linked = new Set(rels.flatMap((r) => [r.source_id, r.target_id]));
  const orphans = cis.filter((c) => !linked.has(c.id));
  const noBusiness = assets.filter((a) => !a.device_role && !ctx.get(a.id)!.systems.length);
  const critical = assets.filter((a) => a.criticality === "Critical" && !a.device_role);
  const mapping = {
    bs: rate(checks.bs),
    sbs: rate(checks.sbs),
    sys: rate(checks.sys),
    comp: rate(checks.comp),
    asset: rate(checks.asset),
    criticalComplete: pct(critical.filter((a) => ctx.get(a.id)!.businessServices.length > 0).length, critical.length),
    completeness: pct(allChecks.filter((x) => x.ok).length, allChecks.length),
    broken: allChecks.filter((x) => !x.ok),
    orphans,
    noBusiness,
  };

  return { cis, rels, byId, out, inn, children, parents, walk, ctx, assets, ownership, byType, mapping };
}
