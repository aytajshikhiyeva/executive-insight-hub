import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, Stat } from "./Panel";
import { Crit, FilterSelect, Table, Td, ZoomPan } from "./cmdb";
import { CLASS_LABEL, hasOwner, isTech, type CI, type Model } from "@/lib/cmdb";

type Cap = Record<string, number>;
const capOf = (c: CI) => (c.capacity ?? {}) as Cap;
export const capUtil = (c: CI) => {
  const k = capOf(c);
  const storage = k.disk_util_pct ?? (k.storage_capacity_tb ? (100 * (k.storage_used_tb ?? 0)) / k.storage_capacity_tb : undefined);
  return { cpu: k.cpu_util_pct, ram: k.ram_util_pct, storage, net: k.throughput_util_pct };
};
export const capStatus = (c: CI) => {
  const vals = Object.values(capUtil(c)).filter((v): v is number => typeof v === "number");
  if (!vals.length) return "No data";
  const mx = Math.max(...vals);
  return mx >= 90 ? "Critical" : mx >= 75 ? "Warning" : "Healthy";
};
const capColor: Record<string, string> = { Healthy: "var(--color-success)", Warning: "var(--color-warning)", Critical: "var(--color-destructive)", "No data": "var(--color-muted-foreground)" };

const NET = new Set(["vlan", "subnet"]);
const typeLabel = (c: CI) => c.asset_type ?? CLASS_LABEL[c.ci_class] ?? c.ci_class;
const TYPE_COLOR: Record<string, string> = {
  server: "var(--color-chart-1)", vm: "var(--color-chart-2)", database: "var(--color-chart-3)", storage: "var(--color-chart-4)",
  middleware: "var(--color-chart-5)", cloud: "var(--color-info)", network_device: "var(--color-warning)", other: "var(--color-muted-foreground)",
  vlan: "var(--color-muted-foreground)", subnet: "var(--color-muted-foreground)",
  business_service: "var(--color-primary)", sub_business_service: "var(--color-info)", system: "var(--color-success)",
};
const LAYERS = ["Business Service", "Sub-Business Service", "System", "Technology Layer Asset", "Network"];

type N = { ci: CI; col: number; layer: string };

function buildScope(m: Model, sbsId: string, direct: boolean) {
  const nodes = new Map<string, N>();
  const sbs = m.byId.get(sbsId)!;
  for (const b of m.parents(sbsId)) nodes.set(b.id, { ci: b, col: 0, layer: LAYERS[0] });
  nodes.set(sbsId, { ci: sbs, col: 1, layer: LAYERS[1] });
  const systems = m.children(sbsId).filter((c) => c.ci_class === "system");
  for (const s of systems) nodes.set(s.id, { ci: s, col: 2, layer: LAYERS[2] });
  const tech: CI[] = [];
  for (const s of systems) {
    for (const x of m.walk(s.id, "down", ["business"])) {
      if (direct && x.depth > 1) continue;
      if (!isTech(x.ci) || nodes.has(x.ci.id)) continue;
      nodes.set(x.ci.id, { ci: x.ci, col: 2 + Math.min(x.depth, 3), layer: LAYERS[3] });
      tech.push(x.ci);
    }
  }
  if (!direct) {
    const netCol = Math.max(3, ...[...nodes.values()].map((n) => n.col)) + 1;
    for (const t of tech) {
      for (const x of m.walk(t.id, "down", ["l2", "l3"])) {
        if (x.depth > 3 || nodes.has(x.ci.id)) continue;
        nodes.set(x.ci.id, { ci: x.ci, col: netCol + Math.min(x.depth - 1, 2), layer: LAYERS[4] });
      }
    }
  }
  return { nodes, systems, tech };
}

export function SbsDependencyGraph({ m, onExplore }: { m: Model; onExplore: (c: CI) => void }) {
  const sbsList = useMemo(() => m.cis.filter((c) => c.ci_class === "sub_business_service"), [m]);
  const [sbsName, setSbsName] = useState(sbsList[0]?.name ?? "");
  const sbs = sbsList.find((s) => s.name === sbsName) ?? sbsList[0];
  const [direct, setDirect] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selId, setSelId] = useState<string | null>(null);

  const scope = useMemo(() => (sbs ? buildScope(m, sbs.id, direct) : null), [m, sbs, direct]);
  if (!sbs || !scope) return <Panel title="Sub-Business Service Dependency Graph"><p className="text-xs text-muted-foreground">No Sub-Business Services in CMDB.</p></Panel>;

  const all = [...scope.nodes.values()];
  const opt = (g: (n: N) => string | null | undefined) => [...new Set(all.map(g).filter(Boolean) as string[])].sort();
  const hidden = new Set<string>();
  for (const id of collapsed) if (scope.nodes.has(id)) for (const x of m.walk(id, "down")) hidden.add(x.ci.id);
  const pass = (n: N) => {
    if (n.ci.id === sbs.id) return true;
    if (hidden.has(n.ci.id)) return false;
    const t = (k: string, v: string | null | undefined) => !f[k] || f[k] === "all" || f[k] === (v ?? "");
    const tech = n.layer === LAYERS[3] || n.layer === LAYERS[4];
    return t("layer", n.layer) && (!tech || (t("type", typeLabel(n.ci)) && t("cap", capStatus(n.ci)))) &&
      t("status", n.ci.status) && t("crit", n.ci.criticality) && t("env", n.ci.environment);
  };
  const vis = all.filter(pass);
  const visIds = new Set(vis.map((n) => n.ci.id));

  // layout
  const NW = 170, NH = 46, CG = 230, RG = 62;
  const cols = new Map<number, N[]>();
  for (const n of vis) (cols.get(n.col) ?? cols.set(n.col, []).get(n.col)!).push(n);
  const pos = new Map<string, { x: number; y: number }>();
  let maxRows = 1;
  [...cols.entries()].sort((a, b) => a[0] - b[0]).forEach(([, ns], ci) => {
    ns.sort((a, b) => a.ci.ci_class.localeCompare(b.ci.ci_class) || a.ci.name.localeCompare(b.ci.name));
    maxRows = Math.max(maxRows, ns.length);
    ns.forEach((n, i) => pos.set(n.ci.id, { x: ci * CG, y: i * RG }));
  });
  for (const [, ns] of cols) {
    const off = ((maxRows - ns.length) * RG) / 2;
    ns.forEach((n) => (pos.get(n.ci.id)!.y += off));
  }
  const edges = m.rels.filter((r) => visIds.has(r.source_id) && visIds.has(r.target_id));
  const sel = selId ? scope.nodes.get(selId)?.ci ?? null : null;
  const hl = new Set<string>();
  if (sel) {
    hl.add(sel.id);
    m.walk(sel.id, "up").forEach((x) => hl.add(x.ci.id));
    m.walk(sel.id, "down").forEach((x) => hl.add(x.ci.id));
  }

  // analysis
  const tech = scope.tech;
  const shared = tech.map((t) => ({ t, sbs: m.ctx.get(t.id)!.subServices })).filter((x) => x.sbs.length > 1);
  const allTech = m.assets.filter((a) => !a.device_role);
  const issues: { ci: CI; issue: string }[] = [
    ...scope.systems.filter((s) => !m.children(s.id).some(isTech)).map((ci) => ({ ci, issue: "System without Technology Layer Asset" })),
    ...allTech.filter((a) => !m.ctx.get(a.id)!.systems.length).map((ci) => ({ ci, issue: "Technology Layer Asset without System" })),
    ...m.cis.filter((c) => c.ci_class === "database" && !m.ctx.get(c.id)!.systems.length).map((ci) => ({ ci, issue: "Database without consuming System" })),
    ...m.cis.filter((c) => c.ci_class === "network_device" && !m.rels.some((r) => r.layer !== "business" && (r.source_id === c.id || r.target_id === c.id))).map((ci) => ({ ci, issue: "Network Device without network relationship" })),
    ...tech.filter((a) => a.criticality === "Critical" && !hasOwner(a)).map((ci) => ({ ci, issue: "Critical Technology Asset without owner" })),
    ...tech.filter((a) => capStatus(a) === "No data").map((ci) => ({ ci, issue: "Technology Asset without capacity data" })),
  ];
  const capCrit = tech.filter((t) => capStatus(t) === "Critical");
  const set = (k: string) => (v: string) => setF({ ...f, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Systems" value={scope.systems.length} info="Systems related to the selected Sub-Business Service." />
        <Stat label="Technology Assets" value={tech.length} info="Technology Layer Assets reachable from those Systems." />
        <Stat label="Critical Assets" value={tech.filter((t) => t.criticality === "Critical").length} tone="danger" info="Critical-criticality assets in this dependency chain." />
        <Stat label="Capacity Critical" value={capCrit.length} tone={capCrit.length ? "danger" : "success"} info="Assets with any utilization ≥ 90%." />
        <Stat label="Shared Assets" value={shared.length} tone={shared.length ? "warning" : "success"} info="Assets that also support other Sub-Business Services." />
        <Stat label="Network Nodes" value={all.filter((n) => n.layer === LAYERS[4]).length} info="L2/L3 dependencies (switches, routers, firewalls, VLANs, subnets)." />
      </div>

      <div className="grid lg:grid-cols-[1fr_330px] gap-4">
        <Panel title={`Dependency Graph · ${sbs.name}`} info="Generated from CMDB relationships only. Click a node for details and impact path; double-click to collapse/expand its downstream.">
          <div className="flex flex-wrap gap-2 mb-3 items-end">
            <FilterSelect label="Sub-Business Service" value={sbs.name} onChange={(v) => { setSbsName(v); setSelId(null); setCollapsed(new Set()); }} options={sbsList.map((s) => s.name)} noAll />
            <FilterSelect label="Layer" value={f.layer ?? "all"} onChange={set("layer")} options={LAYERS} />
            <FilterSelect label="Asset Type" value={f.type ?? "all"} onChange={set("type")} options={opt((n) => (n.layer === LAYERS[3] || n.layer === LAYERS[4] ? typeLabel(n.ci) : null))} />
            <FilterSelect label="Status" value={f.status ?? "all"} onChange={set("status")} options={opt((n) => n.ci.status)} />
            <FilterSelect label="Criticality" value={f.crit ?? "all"} onChange={set("crit")} options={["Critical", "High", "Medium", "Low"]} />
            <FilterSelect label="Capacity" value={f.cap ?? "all"} onChange={set("cap")} options={["Healthy", "Warning", "Critical", "No data"]} />
            <FilterSelect label="Environment" value={f.env ?? "all"} onChange={set("env")} options={opt((n) => n.ci.environment)} />
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Button size="sm" variant={direct ? "default" : "outline"} className="h-7 text-xs" onClick={() => setDirect(true)}>Direct dependencies</Button>
            <Button size="sm" variant={!direct ? "default" : "outline"} className="h-7 text-xs" onClick={() => setDirect(false)}>Full chain</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCollapsed(new Set())}>Expand all</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCollapsed(new Set(scope.systems.map((s) => s.id)))}>Collapse all</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setF({})}>Clear filters</Button>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mb-2">
            {["Healthy", "Warning", "Critical"].map((s) => <span key={s} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: capColor[s] }} />Capacity {s}</span>)}
            {["server", "vm", "database", "storage", "middleware", "cloud", "network_device"].map((k) => <span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: TYPE_COLOR[k] }} />{CLASS_LABEL[k]}</span>)}
          </div>
          <ZoomPan width={cols.size * CG} height={maxRows * RG} k0={0.55}>
            {edges.map((e) => {
              const a = pos.get(e.source_id)!, b = pos.get(e.target_id)!;
              const on = !sel || (hl.has(e.source_id) && hl.has(e.target_id));
              const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
              const back = x2 <= a.x;
              const d = back ? `M${a.x + NW / 2},${a.y + NH} C${a.x + NW / 2},${y2 + 40} ${b.x + NW / 2},${y2 + 40} ${b.x + NW / 2},${b.y + NH}` : `M${x1},${y1} C${x1 + 50},${y1} ${x2 - 50},${y2} ${x2},${y2}`;
              return (
                <g key={e.id} opacity={on ? 1 : 0.12}>
                  <path d={d} fill="none" stroke={e.layer === "business" ? "var(--color-primary)" : "var(--color-warning)"} strokeOpacity={0.55} strokeDasharray={e.layer === "business" ? undefined : "4 3"} strokeWidth={1.2} />
                  {!back && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 3} fontSize={8} textAnchor="middle" fill="var(--color-muted-foreground)">{e.rel_type}</text>}
                </g>
              );
            })}
            {vis.map((n) => {
              const p = pos.get(n.ci.id)!;
              const cs = isTech(n.ci) ? capStatus(n.ci) : null;
              const u = capUtil(n.ci);
              const on = !sel || hl.has(n.ci.id);
              return (
                <g key={n.ci.id} transform={`translate(${p.x},${p.y})`} opacity={on ? 1 : 0.2} className="cursor-pointer"
                  onClick={() => setSelId(n.ci.id)}
                  onDoubleClick={() => setCollapsed((s) => { const x = new Set(s); x.has(n.ci.id) ? x.delete(n.ci.id) : x.add(n.ci.id); return x; })}>
                  <rect width={NW} height={NH} rx={6} fill="var(--color-card)" stroke={sel?.id === n.ci.id ? "var(--color-foreground)" : cs ? capColor[cs] : TYPE_COLOR[n.ci.ci_class]} strokeWidth={sel?.id === n.ci.id ? 2 : 1.2} />
                  <rect width={5} height={NH} rx={2} fill={TYPE_COLOR[n.ci.ci_class] ?? "var(--color-muted-foreground)"} />
                  <text x={10} y={14} fontSize={10} fontWeight={600} fill="var(--color-foreground)">{n.ci.name.length > 26 ? n.ci.name.slice(0, 25) + "…" : n.ci.name}</text>
                  <text x={10} y={26} fontSize={8} fill="var(--color-muted-foreground)">{typeLabel(n.ci)}{collapsed.has(n.ci.id) ? " · collapsed" : ""}</text>
                  {cs && cs !== "No data" && (
                    <text x={10} y={39} fontSize={8} fill={capColor[cs]}>
                      {[u.cpu != null && `CPU ${Math.round(u.cpu)}%`, u.ram != null && `RAM ${Math.round(u.ram)}%`, u.storage != null && `STO ${Math.round(u.storage)}%`, u.net != null && `NET ${Math.round(u.net)}%`].filter(Boolean).join(" · ")}
                    </text>
                  )}
                </g>
              );
            })}
          </ZoomPan>
        </Panel>

        <Panel title="Asset Detail" info="Selected node: attributes, capacity and dependency path.">
          {sel ? <Detail m={m} c={sel} onExplore={onExplore} /> : <p className="text-xs text-muted-foreground">Click a node in the graph.</p>}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={`Shared Asset Analysis (${shared.length})`} info="Technology assets in this chain that also support other Sub-Business Services — a failure impacts all of them.">
          <Table head={["Asset", "Type", "# Sub-Services", "Systems", "Criticality", "Owner", "Capacity"]}>
            {shared.map(({ t, sbs }) => (
              <tr key={t.id} className="cursor-pointer" onClick={() => setSelId(t.id)}>
                <Td className="font-medium">{t.name}</Td><Td>{typeLabel(t)}</Td><Td title={sbs.join(", ")}>{sbs.length}</Td>
                <Td>{m.ctx.get(t.id)!.systems.join(", ")}</Td><Td><Crit v={t.criticality} /></Td>
                <Td>{t.technical_owner ?? t.business_owner ?? "—"}</Td><Td><span style={{ color: capColor[capStatus(t)] }}>{capStatus(t)}</span></Td>
              </tr>
            ))}
          </Table>
          {!shared.length && <p className="text-xs text-muted-foreground mt-2">All assets are dedicated to this Sub-Business Service.</p>}
        </Panel>
        <Panel title={`Missing / Orphan Relationships (${issues.length})`} info="Detected automatically from CMDB data.">
          <Table head={["CI", "Type", "Issue"]}>
            {issues.map((x, i) => (
              <tr key={i} className="cursor-pointer" onClick={() => onExplore(x.ci)}>
                <Td className="font-medium">{x.ci.name}</Td><Td>{typeLabel(x.ci)}</Td><Td className="text-[color:var(--color-warning)]">{x.issue}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </div>
  );
}

function Bar({ label, v }: { label: string; v?: number }) {
  if (v == null) return null;
  const s = v >= 90 ? "Critical" : v >= 75 ? "Warning" : "Healthy";
  return (
    <div className="text-xs">
      <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span style={{ color: capColor[s] }}>{Math.round(v)}%</span></div>
      <div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded" style={{ width: `${Math.min(100, v)}%`, background: capColor[s] }} /></div>
    </div>
  );
}

function Detail({ m, c, onExplore }: { m: Model; c: CI; onExplore: (c: CI) => void }) {
  const x = m.ctx.get(c.id)!;
  const up = m.walk(c.id, "up");
  const down = m.walk(c.id, "down");
  const u = capUtil(c);
  const cap = capOf(c);
  const rows: [string, string | null | undefined][] = [
    ["Type", typeLabel(c)], ["Status", c.status], ["Environment", c.environment], ["Location", c.location],
    ["Business Owner", c.business_owner], ["Technical Owner", c.technical_owner], ["IP Address", c.ip_address], ["Hostname", c.hostname],
    ["OS", c.operating_system], ["Vendor", c.vendor], ["Last Updated", c.updated_at?.slice(0, 10)],
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-sm">{c.name}</span><Crit v={c.criticality} />{isTech(c) && <Badge variant="outline" style={{ color: capColor[capStatus(c)] }}>{capStatus(c)}</Badge>}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">{rows.map(([k, v]) => <div key={k}><span className="text-muted-foreground">{k}: </span>{v || "—"}</div>)}</div>
      {isTech(c) && (
        <div className="space-y-2">
          <Bar label="CPU Utilization" v={u.cpu} /><Bar label="RAM Utilization" v={u.ram} /><Bar label="Storage Utilization" v={u.storage} /><Bar label="Network Utilization" v={u.net} />
          <div className="text-[11px] text-muted-foreground">{Object.entries(cap).filter(([k]) => !k.endsWith("_pct")).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ") || "No capacity data"}</div>
        </div>
      )}
      <div className="text-xs space-y-1 border-t border-border pt-2">
        <div className="font-medium">Business impact if this fails</div>
        <div><span className="text-muted-foreground">Business Services: </span>{x.businessServices.join(", ") || "—"}</div>
        <div><span className="text-muted-foreground">Sub-Services: </span>{x.subServices.join(", ") || "—"}</div>
        <div><span className="text-muted-foreground">Systems: </span>{x.systems.join(", ") || "—"}</div>
        <div><span className="text-muted-foreground">Upstream: </span>{up.length} · <span className="text-muted-foreground">Downstream: </span>{down.length}</div>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => onExplore(c)}>Open full relationship explorer</Button>
    </div>
  );
}
