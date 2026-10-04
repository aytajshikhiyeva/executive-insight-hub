import { useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, ZoomIn, ZoomOut, Maximize2, UserPlus, Network, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Panel, Stat } from "./Panel";
import { AssetSection } from "./sections";
import { SbsDependencyGraph } from "./sbs-graph";
import { CLASS_LABEL, hasOwner, isTech, ownerStatus, updateOwners, useCmdb, type CI, type Model } from "@/lib/cmdb";

const critTone: Record<string, string> = {
  Critical: "bg-[color:var(--color-destructive)]/20 text-[color:var(--color-destructive)]",
  High: "bg-[color:var(--color-warning)]/20 text-[color:var(--color-warning)]",
  Medium: "bg-[color:var(--color-info)]/20 text-[color:var(--color-info)]",
  Low: "bg-muted text-muted-foreground",
};
export const Crit = ({ v }: { v: string }) => <Badge className={`border-0 ${critTone[v] ?? ""}`}>{v}</Badge>;
const fmt = (n: number) => `${n.toFixed(1)}%`;
const tone = (n: number): "success" | "warning" | "danger" => (n >= 95 ? "success" : n >= 85 ? "warning" : "danger");

export function CmdbSection() {
  const { model, isLoading, error } = useCmdb();
  const [explore, setExplore] = useState<CI | null>(null);
  const [assign, setAssign] = useState<CI | null>(null);
  const [tab, setTab] = useState("ownership");
  const [drillType, setDrillType] = useState<string | null>(null);

  if (error) return <Panel title="CMDB">Could not load CMDB data: {String((error as Error).message)}</Panel>;
  if (isLoading || !model) return <Panel title="CMDB">Loading CMDB…</Panel>;

  const actions = { onExplore: setExplore, onAssign: setAssign };
  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="ownership">Ownership</TabsTrigger>
            <TabsTrigger value="unowned">Assets Without Owners</TabsTrigger>
            <TabsTrigger value="mapping">Business → Technology</TabsTrigger>
            <TabsTrigger value="graph">Dependency Graph</TabsTrigger>
            <TabsTrigger value="sbsgraph">Sub-Service Dependencies</TabsTrigger>
            <TabsTrigger value="coverage">Mapping Coverage</TabsTrigger>
            <TabsTrigger value="network">Network L2 / L3</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="ownership">
          <Ownership m={model} {...actions} onDrill={(t) => { setDrillType(t); setTab("unowned"); }} />
        </TabsContent>
        <TabsContent value="unowned"><Unowned m={model} {...actions} typeFilter={drillType} setTypeFilter={setDrillType} /></TabsContent>
        <TabsContent value="mapping"><Hierarchy m={model} {...actions} /></TabsContent>
        <TabsContent value="graph"><DependencyGraph m={model} {...actions} /></TabsContent>
        <TabsContent value="sbsgraph"><SbsDependencyGraph m={model} onExplore={actions.onExplore} /></TabsContent>
        <TabsContent value="coverage"><Coverage m={model} {...actions} /></TabsContent>
        <TabsContent value="network"><NetworkView m={model} {...actions} /></TabsContent>
        <TabsContent value="lifecycle"><AssetSection /></TabsContent>
      </Tabs>
      <Explorer m={model} ci={explore} onClose={() => setExplore(null)} onAssign={setAssign} />
      <AssignOwner ci={assign} onClose={() => setAssign(null)} m={model} />
    </div>
  );
}

type Act = { m: Model; onExplore: (c: CI) => void; onAssign: (c: CI) => void };

function RowActions({ c, onExplore, onAssign }: { c: CI } & Omit<Act, "m">) {
  return (
    <div className="flex gap-1 justify-end">
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onAssign(c)}><UserPlus className="h-3 w-3" /> Owner</Button>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onExplore(c)}><Network className="h-3 w-3" /> Explore</Button>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground"><tr>{head.map((h) => <th key={h} className="text-left font-medium px-2 py-2 border-b border-border whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <td className={`px-2 py-1.5 border-b border-border/50 whitespace-nowrap ${className}`}>{children ?? <span className="text-muted-foreground">—</span>}</td>
);

export function FilterSelect({ label, value, onChange, options, noAll }: { label: string; value: string; onChange: (v: string) => void; options: string[]; noAll?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="grafana-title">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {!noAll && <SelectItem value="all">All</SelectItem>}
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ---------------- 1. Ownership overview ---------------- */
const FILTERS: { key: string; label: string; get: (c: CI, m: Model) => string[] }[] = [
  { key: "type", label: "Asset Type", get: (c) => [CLASS_LABEL[c.ci_class] ?? c.ci_class] },
  { key: "cat", label: "Category", get: (c) => [c.category ?? ""] },
  { key: "bs", label: "Business Service", get: (c, m) => m.ctx.get(c.id)!.businessServices },
  { key: "sbs", label: "Sub-Business Service", get: (c, m) => m.ctx.get(c.id)!.subServices },
  { key: "sys", label: "System", get: (c, m) => m.ctx.get(c.id)!.systems },
  { key: "tcat", label: "Technology Category", get: (c) => [c.asset_category ?? ""] },
  { key: "ttype", label: "Technology Asset Type", get: (c) => [c.asset_type ?? ""] },
  { key: "crit", label: "Criticality", get: (c) => [c.criticality] },
  { key: "env", label: "Environment", get: (c) => [c.environment ?? ""] },
  { key: "dept", label: "Department", get: (c) => [c.department ?? ""] },
  { key: "bo", label: "Business Owner", get: (c) => [c.business_owner ?? "(none)"] },
  { key: "to", label: "Technical Owner", get: (c) => [c.technical_owner ?? "(none)"] },
  { key: "loc", label: "Location", get: (c) => [c.location ?? ""] },
  { key: "status", label: "Status", get: (c) => [c.status ?? ""] },
];

function useFiltered(m: Model, list: CI[]) {
  const [f, setF] = useState<Record<string, string>>({});
  const opts = useMemo(
    () => Object.fromEntries(FILTERS.map((x) => [x.key, [...new Set(m.assets.flatMap((c) => x.get(c, m)))].filter(Boolean).sort()])),
    [m],
  );
  const rows = list.filter((c) => FILTERS.every((x) => !f[x.key] || f[x.key] === "all" || x.get(c, m).includes(f[x.key])));
  const bar = (
    <div className="flex flex-wrap gap-3 items-end">
      {FILTERS.map((x) => (
        <FilterSelect key={x.key} label={x.label} value={f[x.key] ?? "all"} onChange={(v) => setF({ ...f, [x.key]: v })} options={opts[x.key]} />
      ))}
      <Button size="sm" variant="ghost" className="h-8" onClick={() => setF({})}>Reset</Button>
    </div>
  );
  return { rows, bar };
}

function Ownership({ m, onDrill, onExplore, onAssign }: Act & { onDrill: (t: string) => void }) {
  const { rows, bar } = useFiltered(m, m.assets);
  const sub = useMemo(() => buildModelSubset(m, rows), [m, rows]);
  return (
    <div className="space-y-4">
      <Panel title="Filters" info="All metrics recalculate live from the CMDB records matching these filters.">{bar}</Panel>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Assets" value={sub.total} info="Count of technology CIs (servers, DBs, network, storage, VMs, cloud, middleware, other)." />
        <Stat label="Assets with Owner" value={sub.owned} tone="success" info="Assets with at least a business or technical owner." />
        <Stat label="Assets without Owner" value={sub.total - sub.owned} tone={sub.total - sub.owned ? "danger" : "success"} info="Assets with neither owner set." />
        <Stat label="Ownership Coverage" value={fmt(sub.cov)} tone={tone(sub.cov)} info="Assets with ≥1 valid owner / Total Assets × 100." />
        <Stat label="Business Owner Coverage" value={fmt(sub.biz)} tone={tone(sub.biz)} info="Share of assets with a named business owner." />
        <Stat label="Technical Owner Coverage" value={fmt(sub.tech)} tone={tone(sub.tech)} info="Share of assets with a responsible technical owner/team." />
        <Stat label="Critical Assets w/o Owner" value={sub.critUn} tone={sub.critUn ? "danger" : "success"} info="Criticality = Critical and no owner." />
        <Stat label="Incomplete Ownership" value={sub.inc} tone={sub.inc ? "warning" : "success"} info="Only one of business / technical owner is set." />
      </div>
      <Panel title="Ownership Coverage by Asset Type" info="Click a row to drill into the underlying assets.">
        <Table head={["Asset Type", "Total", "Owned", "Unowned", "Coverage", ""]}>
          {sub.byType.map((r) => (
            <tr key={r.type} className="cursor-pointer hover:bg-accent/40" onClick={() => onDrill(r.type)}>
              <Td>{r.type}</Td><Td className="tabular-nums">{r.total}</Td><Td className="tabular-nums">{r.owned}</Td>
              <Td className="tabular-nums">{r.unowned}</Td><Td className="tabular-nums">{fmt(r.coverage)}</Td>
              <Td className="w-1/3">
                <div className="h-2 rounded bg-muted overflow-hidden">
                  <div className="h-full" style={{ width: `${r.coverage}%`, background: `var(--color-${tone(r.coverage) === "danger" ? "destructive" : tone(r.coverage)})` }} />
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
      <Panel title={`Assets (${rows.length})`}>
        <AssetTable rows={rows} m={m} onExplore={onExplore} onAssign={onAssign} />
      </Panel>
    </div>
  );
}

function buildModelSubset(_m: Model, rows: CI[]) {
  const owned = rows.filter(hasOwner).length;
  const p = (n: number) => (rows.length ? (n / rows.length) * 100 : 0);
  const types: Record<string, { total: number; owned: number }> = {};
  rows.forEach((a) => {
    const k = CLASS_LABEL[a.ci_class] ?? a.ci_class;
    types[k] ??= { total: 0, owned: 0 };
    types[k].total++;
    if (hasOwner(a)) types[k].owned++;
  });
  return {
    total: rows.length, owned, cov: p(owned),
    biz: p(rows.filter((a) => a.business_owner?.trim()).length),
    tech: p(rows.filter((a) => a.technical_owner?.trim()).length),
    critUn: rows.filter((a) => !hasOwner(a) && a.criticality === "Critical").length,
    inc: rows.filter((a) => ownerStatus(a) === "Incomplete").length,
    byType: Object.entries(types).map(([type, v]) => ({ type, ...v, unowned: v.total - v.owned, coverage: p(0) * 0 + (v.owned / v.total) * 100 })).sort((a, b) => b.total - a.total),
  };
}

function AssetTable({ rows, m, onExplore, onAssign }: { rows: CI[] } & Act) {
  return (
    <Table head={["Asset Name", "Type", "Category", "Criticality", "Business Service", "Sub-Business Service", "Related System", "Environment", "Location", "Business Owner", "Technical Owner", "Owner Status", "Last Updated", ""]}>
      {rows.map((c) => {
        const x = m.ctx.get(c.id)!;
        const st = ownerStatus(c);
        const hot = st === "Unowned" && (c.criticality === "Critical" || c.criticality === "High");
        return (
          <tr key={c.id} className={hot ? "bg-[color:var(--color-destructive)]/10" : ""}>
            <Td className="font-medium">{hot && <AlertTriangle className="inline h-3 w-3 mr-1 text-[color:var(--color-destructive)]" />}{c.name}</Td>
            <Td>{CLASS_LABEL[c.ci_class]}</Td><Td>{c.category}</Td><Td><Crit v={c.criticality} /></Td>
            <Td>{x.businessServices.join(", ") || null}</Td><Td>{x.subServices.join(", ") || null}</Td><Td>{x.systems.join(", ") || null}</Td>
            <Td>{c.environment}</Td><Td>{c.location}</Td><Td>{c.business_owner}</Td><Td>{c.technical_owner}</Td>
            <Td><Badge variant="outline" className={st === "Complete" ? "text-[color:var(--color-success)]" : st === "Incomplete" ? "text-[color:var(--color-warning)]" : "text-[color:var(--color-destructive)]"}>{st}</Badge></Td>
            <Td>{new Date(c.updated_at).toLocaleString()}</Td>
            <Td><RowActions c={c} onExplore={onExplore} onAssign={onAssign} /></Td>
          </tr>
        );
      })}
    </Table>
  );
}

/* ---------------- 2. Assets without owners ---------------- */
const QUICK: { label: string; test: (c: CI) => boolean }[] = [
  { label: "Critical Assets", test: (c) => c.criticality === "Critical" },
  { label: "High Criticality", test: (c) => c.criticality === "High" },
  { label: "Production Assets", test: (c) => c.environment === "Production" },
  { label: "Network Assets", test: (c) => c.ci_class === "network_device" },
  { label: "Servers", test: (c) => c.ci_class === "server" || c.ci_class === "vm" },
  { label: "Databases", test: (c) => c.ci_class === "database" },
  { label: "Applications", test: (c) => c.ci_class === "middleware" },
  { label: "Cloud Assets", test: (c) => c.ci_class === "cloud" },
  { label: "Other Technology Assets", test: (c) => c.ci_class === "other" || c.ci_class === "storage" },
];

function Unowned({ m, onExplore, onAssign, typeFilter, setTypeFilter }: Act & { typeFilter: string | null; setTypeFilter: (t: string | null) => void }) {
  const [quick, setQuick] = useState<string[]>([]);
  const [incl, setIncl] = useState(false);
  const base = m.assets.filter((c) => (incl ? ownerStatus(c) !== "Complete" : !hasOwner(c)));
  const rows = base
    .filter((c) => !typeFilter || CLASS_LABEL[c.ci_class] === typeFilter)
    .filter((c) => quick.every((q) => QUICK.find((x) => x.label === q)!.test(c)))
    .sort((a, b) => ["Critical", "High", "Medium", "Low"].indexOf(a.criticality) - ["Critical", "High", "Medium", "Low"].indexOf(b.criticality));
  return (
    <Panel title={`Assets Without Owners (${rows.length})`} info="Live list from CMDB. Assigning an owner updates the record and recalculates coverage immediately.">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {typeFilter && <Badge className="cursor-pointer" onClick={() => setTypeFilter(null)}>Type: {typeFilter} ✕</Badge>}
        {QUICK.map((q) => {
          const on = quick.includes(q.label);
          return (
            <Button key={q.label} size="sm" variant={on ? "default" : "outline"} className="h-7 text-xs"
              onClick={() => setQuick(on ? quick.filter((x) => x !== q.label) : [...quick, q.label])}>{q.label}</Button>
          );
        })}
        <Button size="sm" variant={incl ? "default" : "outline"} className="h-7 text-xs" onClick={() => setIncl(!incl)}>Include incomplete ownership</Button>
      </div>
      <AssetTable rows={rows} m={m} onExplore={onExplore} onAssign={onAssign} />
    </Panel>
  );
}

/* ---------------- Assign owner ---------------- */
function AssignOwner({ ci, onClose, m }: { ci: CI | null; onClose: () => void; m: Model }) {
  const qc = useQueryClient();
  const [bo, setBo] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if (ci && ci.id !== lastId) {
    setLastId(ci.id);
    setBo(ci.business_owner ?? "");
    setTo(ci.technical_owner ?? "");
  }
  const known = [...new Set(m.cis.flatMap((c) => [c.business_owner, c.technical_owner]).filter(Boolean) as string[])].sort();
  const save = async () => {
    if (!ci) return;
    setBusy(true);
    try {
      await updateOwners(ci.id, bo.trim() || null, to.trim() || null, qc);
      toast.success(`Owners updated for ${ci.name}`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!ci} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign Owner · {ci?.name}</DialogTitle></DialogHeader>
        <datalist id="owners">{known.map((k) => <option key={k} value={k} />)}</datalist>
        <div className="space-y-3">
          <label className="block text-xs space-y-1"><span className="grafana-title">Business Owner</span>
            <Input list="owners" value={bo} onChange={(e) => setBo(e.target.value)} placeholder="Accountable business person/function" /></label>
          <label className="block text-xs space-y-1"><span className="grafana-title">Technical Owner</span>
            <Input list="owners" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Responsible technical person/team" /></label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save to CMDB"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- 4. Business → Technology hierarchy ---------------- */
function Hierarchy({ m, onExplore }: Act) {
  const bss = m.cis.filter((c) => c.ci_class === "business_service");
  const Node = ({ c, depth }: { c: CI; depth: number }) => {
    const kids = m.children(c.id);
    const [open, setOpen] = useState(depth < 2);
    return (
      <div style={{ marginLeft: depth ? 16 : 0 }} className="border-l border-border/60 pl-2">
        <div className="flex items-center gap-2 py-1">
          <button className="w-4 text-muted-foreground" onClick={() => setOpen(!open)}>{kids.length ? (open ? "▾" : "▸") : "·"}</button>
          <Badge variant="outline" className="text-[10px]">{CLASS_LABEL[c.ci_class]}</Badge>
          <button className="text-sm hover:underline text-left" onClick={() => onExplore(c)}>{c.name}</button>
          <Crit v={c.criticality} />
          {!hasOwner(c) && isTech(c) && <Badge className="border-0 bg-[color:var(--color-destructive)]/20 text-[color:var(--color-destructive)]">No owner</Badge>}
        </div>
        {open && kids.map((k) => <Node key={k.id} c={k} depth={depth + 1} />)}
      </div>
    );
  };
  return (
    <Panel title="Business Service → Sub-Service → System → Technology Layer Assets" info="Tree is generated from CMDB 'contains / supports / depends on / runs on / hosted on / uses' relationships.">
      <div className="space-y-2">{bss.map((b) => <Node key={b.id} c={b} depth={0} />)}</div>
    </Panel>
  );
}

/* ---------------- 5. Dependency graph (SVG, zoom/pan) ---------------- */
const LAYER_ORDER = ["business_service", "sub_business_service", "system", "tech"];
const layerOf = (c: CI) => (isTech(c) ? 3 : LAYER_ORDER.indexOf(c.ci_class));
const LAYER_COLOR = ["var(--color-primary)", "var(--color-info)", "var(--color-success)", "var(--color-warning)"];

export function ZoomPan({ children, width, height, k0 = 0.9 }: { children: ReactNode; width: number; height: number; k0?: number }) {
  const [t, setT] = useState({ x: 40, y: 30, k: k0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setT({ ...t, k: t.k * 1.2 })}><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setT({ ...t, k: t.k / 1.2 })}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setT({ x: 40, y: 30, k: k0 })}><Maximize2 className="h-3.5 w-3.5" /></Button>
      </div>
      <svg
        className="w-full h-[560px] rounded border border-border bg-background touch-none cursor-grab"
        onWheel={(e) => setT({ ...t, k: Math.min(3, Math.max(0.2, t.k * (e.deltaY < 0 ? 1.1 : 0.9))) })}
        onPointerDown={(e) => { if ((e.target as Element).tagName === "svg") drag.current = { x: e.clientX - t.x, y: e.clientY - t.y }; }}
        onPointerMove={(e) => drag.current && setT({ ...t, x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`} data-w={width} data-h={height}>{children}</g>
      </svg>
    </div>
  );
}

function DependencyGraph({ m, onExplore }: Act) {
  const [q, setQ] = useState("");
  const [crit, setCrit] = useState("all");
  const [bsF, setBsF] = useState("all");
  const [sbsF, setSbsF] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<CI | null>(null);

  const bsList = useMemo(() => m.cis.filter((c) => c.ci_class === "business_service"), [m]);
  const sbsOptions = useMemo(() => {
    const all = m.cis.filter((c) => c.ci_class === "sub_business_service");
    if (bsF === "all") return all.map((c) => c.name);
    const bs = bsList.find((b) => b.name === bsF);
    return bs ? m.children(bs.id).filter((c) => c.ci_class === "sub_business_service").map((c) => c.name) : [];
  }, [m, bsF, bsList]);

  const { nodes, edges, groups, w, h } = useMemo(() => {
    const hidden = new Set<string>();
    collapsed.forEach((id) => m.walk(id, "down", ["business"]).forEach((x) => hidden.add(x.ci.id)));
    const ok = (c: CI) => layerOf(c) >= 0 && !c.device_role && !hidden.has(c.id) && (crit === "all" || c.criticality === crit);
    const down = (id: string) => [id, ...m.walk(id, "down", ["business"]).map((x) => x.ci.id)];

    // Build groups per business service, honouring BS / SBS filters
    const sbsSel = sbsF !== "all" ? m.cis.find((c) => c.ci_class === "sub_business_service" && c.name === sbsF) : null;
    const groupDefs: { label: string; ids: string[] }[] = [];
    for (const bs of bsList) {
      if (bsF !== "all" && bs.name !== bsF) continue;
      if (sbsSel) {
        if (!m.children(bs.id).some((k) => k.id === sbsSel.id)) continue;
        groupDefs.push({ label: bs.name, ids: [bs.id, ...down(sbsSel.id)] });
      } else groupDefs.push({ label: bs.name, ids: down(bs.id) });
    }
    if (bsF === "all" && !sbsSel) {
      const covered = new Set(groupDefs.flatMap((g) => g.ids));
      const rest = m.cis.filter((c) => !covered.has(c.id)).map((c) => c.id);
      if (rest.length) groupDefs.push({ label: "Not mapped to a Business Service", ids: rest });
    }

    const pos = new Map<string, { x: number; y: number; c: CI }>();
    const groups: { label: string; y: number; h: number; count: number }[] = [];
    let y0 = 0;
    for (const g of groupDefs) {
      const cols: CI[][] = [[], [], [], [], []];
      g.ids.forEach((id) => {
        const c = m.byId.get(id);
        if (c && ok(c) && !pos.has(id)) cols[layerOf(c)].push(c);
      });
      const rows = Math.max(...cols.map((c) => c.length));
      if (!rows) continue;
      cols.forEach((col, i) => col.forEach((c, j) => pos.set(c.id, { x: i * 260, y: y0 + 30 + j * 34, c })));
      const gh = 30 + rows * 34 + 10;
      groups.push({ label: g.label, y: y0, h: gh, count: cols.flat().length });
      y0 += gh + 24;
    }
    const edges = m.rels.filter((r) => r.layer === "business" && pos.has(r.source_id) && pos.has(r.target_id));
    return { nodes: [...pos.values()], edges, groups, w: 5 * 260 + 220, h: y0 };
  }, [m, collapsed, crit, bsF, sbsF, bsList]);

  const ql = q.toLowerCase();
  const related = sel ? new Set([sel.id, ...m.walk(sel.id, "up", ["business"]).map((x) => x.ci.id), ...m.walk(sel.id, "down", ["business"]).map((x) => x.ci.id)]) : null;
  const P = new Map(nodes.map((n) => [n.c.id, n]));

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <Panel title="Relationship / Dependency Graph" info="Drag to pan, scroll or buttons to zoom. Click a node to select; double-click to expand/collapse its children.">
        <div className="flex flex-wrap gap-2 mb-3 items-end">
          <div className="relative"><Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nodes" className="h-8 pl-7 w-56 text-xs" /></div>
          <FilterSelect label="Business Service" value={bsF} onChange={(v) => { setBsF(v); setSbsF("all"); }} options={bsList.map((b) => b.name)} />
          <FilterSelect label="Sub-Business Service" value={sbsF} onChange={setSbsF} options={sbsOptions} />
          <FilterSelect label="Criticality" value={crit} onChange={setCrit} options={["Critical", "High", "Medium", "Low"]} />
          <Button size="sm" variant="outline" className="h-8" onClick={() => setCollapsed(new Set())}>Expand all</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setCollapsed(new Set(m.cis.filter((c) => c.ci_class === "system").map((c) => c.id)))}>Collapse systems</Button>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mb-2">
          {["Business Service", "Sub-Business Service", "System", "Technology Layer Asset"].map((l, i) => (
            <span key={l} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: LAYER_COLOR[i] }} />{l}</span>
          ))}
        </div>
        <ZoomPan width={w} height={h} k0={0.6}>
          {groups.map((g) => (
            <g key={g.label} transform={`translate(-12,${g.y})`}>
              <rect width={w - 20} height={g.h} rx={8} fill="var(--color-primary)" fillOpacity={0.05} stroke="var(--color-primary)" strokeOpacity={0.35} strokeDasharray="4 4" />
              <text x={12} y={19} fontSize={13} fontWeight={600} fill="var(--color-primary)">{g.label} · {g.count} CIs</text>
            </g>
          ))}
          {edges.map((e) => {
            const a = P.get(e.source_id)!, b = P.get(e.target_id)!;
            const on = !related || (related.has(a.c.id) && related.has(b.c.id));
            return (
              <g key={e.id} opacity={on ? 0.8 : 0.1}>
                <path d={`M${a.x + 200},${a.y + 12} C${a.x + 230},${a.y + 12} ${b.x - 30},${b.y + 12} ${b.x},${b.y + 12}`} fill="none" stroke="var(--color-border)" strokeWidth={1.2} />
              </g>
            );
          })}
          {nodes.map(({ x, y, c }) => {
            const hit = ql && c.name.toLowerCase().includes(ql);
            const dim = (related && !related.has(c.id)) || (ql && !hit);
            return (
              <g key={c.id} transform={`translate(${x},${y})`} className="cursor-pointer" opacity={dim ? 0.25 : 1}
                onClick={() => setSel(c)}
                onDoubleClick={() => { const s = new Set(collapsed); s.has(c.id) ? s.delete(c.id) : s.add(c.id); setCollapsed(s); }}>
                <rect width={200} height={24} rx={4} fill="var(--color-panel)" stroke={hit || sel?.id === c.id ? "var(--color-primary)" : LAYER_COLOR[layerOf(c)]} strokeWidth={hit || sel?.id === c.id ? 2 : 1} />
                <circle cx={10} cy={12} r={4} fill={LAYER_COLOR[layerOf(c)]} />
                <text x={20} y={16} fontSize={11} fill="var(--color-foreground)">{c.name.length > 28 ? c.name.slice(0, 27) + "…" : c.name}{collapsed.has(c.id) ? " [+]" : ""}</text>
              </g>
            );
          })}
        </ZoomPan>
      </Panel>
      <Panel title="Node Details">
        {sel ? <NodeDetails m={m} c={sel} onExplore={onExplore} /> : <p className="text-xs text-muted-foreground">Select a node in the graph.</p>}
      </Panel>
    </div>
  );
}

function NodeDetails({ m, c, onExplore }: { m: Model; c: CI; onExplore: (c: CI) => void }) {
  const x = m.ctx.get(c.id)!;
  const down = m.walk(c.id, "down").map((d) => d.ci);
  const Row = ({ k, v }: { k: string; v?: string | null }) => (
    <div className="flex justify-between gap-2 py-1 border-b border-border/40 text-xs"><span className="text-muted-foreground">{k}</span><span className="text-right">{v || "—"}</span></div>
  );
  return (
    <div>
      <div className="font-semibold mb-2">{c.name}</div>
      <Row k="Type" v={CLASS_LABEL[c.ci_class]} /><Row k="Status" v={c.status} /><Row k="Criticality" v={c.criticality} />
      <Row k="Owner" v={c.business_owner || c.technical_owner} /><Row k="Technical Owner" v={c.technical_owner} /><Row k="Business Owner" v={c.business_owner} />
      <Row k="Related Services" v={[...x.businessServices, ...x.subServices].join(", ")} />
      <Row k="Related Systems" v={x.systems.join(", ")} />
      <Row k="Related Assets" v={down.filter(isTech).map((d) => d.name).join(", ")} />
      <Row k="Dependencies" v={String(down.length)} />
      <Row k="Last Updated" v={new Date(c.updated_at).toLocaleString()} />
      <Button size="sm" className="mt-3 w-full" onClick={() => onExplore(c)}><Network className="h-3.5 w-3.5" /> Explore Relationships</Button>
    </div>
  );
}

/* ---------------- 6. Mapping coverage ---------------- */
function Coverage({ m, onExplore }: Act) {
  const mp = m.mapping;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Mapping Completeness" value={fmt(mp.completeness)} tone={tone(mp.completeness)} info="Passed relationship checks / all required relationship checks across the hierarchy." />
        <Stat label="BS → Sub-Service" value={fmt(mp.bs)} tone={tone(mp.bs)} info="% of Business Services with at least one Sub-Business Service." />
        <Stat label="Sub-Service → System" value={fmt(mp.sbs)} tone={tone(mp.sbs)} info="% of Sub-Business Services mapped to a System." />
        <Stat label="System → Technology Layer" value={fmt(mp.sys)} tone={tone(mp.sys)} info="% of Systems mapped to Technology Layer Assets, including a Database." />
        <Stat label="Technology Asset → System" value={fmt(mp.asset)} tone={tone(mp.asset)} info="% of application-tier Technology Layer Assets linked to a System." />
        <Stat label="Critical Assets Fully Mapped" value={fmt(mp.criticalComplete)} tone={tone(mp.criticalComplete)} info="Critical assets that trace up to a Business Service." />
        <Stat label="Orphan CIs" value={mp.orphans.length} tone={mp.orphans.length ? "danger" : "success"} info="CIs with no relationship at all." />
      </div>
      <Panel title={`Broken / Incomplete Mappings (${mp.broken.length})`} info="Each row names the exact missing relationship.">
        <Table head={["CI", "Type", "Criticality", "Missing", ""]}>
          {mp.broken.map((b) => (
            <tr key={b.ci.id}>
              <Td className="font-medium">{b.ci.name}</Td><Td>{CLASS_LABEL[b.ci.ci_class]}</Td><Td><Crit v={b.ci.criticality} /></Td>
              <Td className="text-[color:var(--color-destructive)]">{b.missing.map((x) => `→ ${x}`).join("  ")}</Td>
              <Td><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onExplore(b.ci)}>Explore</Button></Td>
            </tr>
          ))}
        </Table>
      </Panel>
      <div className="grid md:grid-cols-2 gap-4">
        <Panel title={`Orphan CIs (${mp.orphans.length})`} info="No upstream or downstream relationship of any kind.">
          <ul className="text-xs space-y-1">{mp.orphans.map((o) => <li key={o.id}>{o.name} <span className="text-muted-foreground">· {CLASS_LABEL[o.ci_class]}</span></li>)}</ul>
        </Panel>
        <Panel title={`Assets without Business Mapping (${mp.noBusiness.length})`} info="Technology assets not traceable to any System.">
          <ul className="text-xs space-y-1">{mp.noBusiness.map((o) => <li key={o.id}>{o.name} <span className="text-muted-foreground">· {CLASS_LABEL[o.ci_class]}</span></li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- 7/8. Network L2/L3 ---------------- */
const ROLE_TIER: Record<string, number> = { internet: 0, firewall: 1, core_router: 2, core_switch: 3, distribution_switch: 4, access_switch: 5, access_point: 6 };
const ROLE_LABEL = ["Internet", "Firewall", "Core Router", "Core Switch", "Distribution Switch", "Access Switch / AP", "Access Point", "Servers / Endpoints"];

function NetworkView({ m, onExplore }: Act) {
  const [layer, setLayer] = useState<"l2" | "l3" | "all">("all");
  const [sel, setSel] = useState<CI | null>(null);
  const { nodes, edges, w } = useMemo(() => {
    const netRels = m.rels.filter((r) => (layer === "all" ? r.layer !== "business" : r.layer === layer) && !["member of", "in subnet", "trunks", "mapped to", "gateway"].includes(r.rel_type));
    const ids = new Set(netRels.flatMap((r) => [r.source_id, r.target_id]));
    m.cis.filter((c) => c.device_role).forEach((c) => ids.add(c.id));
    const tiers: CI[][] = Array.from({ length: 8 }, () => []);
    ids.forEach((id) => {
      const c = m.byId.get(id)!;
      const t = c.device_role ? (ROLE_TIER[c.device_role] === 6 ? 5 : ROLE_TIER[c.device_role] ?? 7) : 7;
      tiers[t].push(c);
    });
    const maxW = Math.max(...tiers.map((t) => t.length)) * 150;
    const pos = new Map<string, { x: number; y: number; c: CI; t: number }>();
    tiers.forEach((tier, t) => {
      tier.sort((a, b) => a.name.localeCompare(b.name));
      const off = (maxW - tier.length * 150) / 2;
      tier.forEach((c, i) => pos.set(c.id, { x: off + i * 150, y: t * 80, c, t }));
    });
    return { nodes: [...pos.values()], edges: netRels.filter((r) => pos.has(r.source_id) && pos.has(r.target_id)), w: maxW, P: pos };
  }, [m, layer]);
  const P = new Map(nodes.map((n) => [n.c.id, n]));

  const l2Rows = m.rels.filter((r) => r.layer === "l2" && r.rel_type === "connects to");
  const vlanOf = (id: string) => (m.out.get(id) ?? []).filter((r) => r.rel_type === "member of").map((r) => m.byId.get(r.target_id)?.name).join(", ");
  const l3Devices = m.cis.filter((c) => c.ip_address && (isTech(c)));
  const routing = (id: string) =>
    [...(m.out.get(id) ?? []), ...(m.inn.get(id) ?? [])].filter((r) => r.layer === "l3" && r.rel_type !== "in subnet")
      .map((r) => `${r.rel_type} ${m.byId.get(r.source_id === id ? r.target_id : r.source_id)?.name}`).join("; ");

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <Panel title="Dynamic Network Topology" info="Tiers derived from each device's CMDB network role; links from L2/L3 relationships. Any CMDB change re-renders automatically."
          actions={<div className="flex gap-1">{(["all", "l2", "l3"] as const).map((l) => <Button key={l} size="sm" variant={layer === l ? "default" : "outline"} className="h-7 text-xs" onClick={() => setLayer(l)}>{l.toUpperCase()}</Button>)}</div>}>
          <ZoomPan width={w} height={640} k0={0.75}>
            {ROLE_LABEL.map((l, t) => t !== 6 && <text key={l} x={-10} y={t * 80 - 6} fontSize={10} fill="var(--color-muted-foreground)">{l}</text>)}
            {edges.map((e) => {
              const a = P.get(e.source_id)!, b = P.get(e.target_id)!;
              const down = e.link_status === "down";
              return <line key={e.id} x1={a.x + 60} y1={a.y + 14} x2={b.x + 60} y2={b.y + 14} stroke={down ? "var(--color-destructive)" : e.layer === "l3" ? "var(--color-info)" : "var(--color-success)"} strokeDasharray={down ? "4 3" : undefined} strokeWidth={1.3} opacity={0.75} />;
            })}
            {nodes.map(({ x, y, c }) => (
              <g key={c.id} transform={`translate(${x},${y})`} className="cursor-pointer" onClick={() => setSel(c)}>
                <rect width={120} height={28} rx={5} fill="var(--color-panel)" stroke={sel?.id === c.id ? "var(--color-primary)" : "var(--color-border)"} strokeWidth={sel?.id === c.id ? 2 : 1} />
                <text x={6} y={12} fontSize={9.5} fill="var(--color-foreground)">{c.name.length > 19 ? c.name.slice(0, 18) + "…" : c.name}</text>
                <text x={6} y={23} fontSize={8} fill="var(--color-muted-foreground)">{c.ip_address ?? ""}</text>
              </g>
            ))}
          </ZoomPan>
          <div className="flex gap-4 text-[10px] text-muted-foreground mt-2">
            <span className="text-[color:var(--color-success)]">━ L2 link</span><span className="text-[color:var(--color-info)]">━ L3 link</span><span className="text-[color:var(--color-destructive)]">┅ Link down</span>
          </div>
        </Panel>
        <Panel title="Device Details">{sel ? <NodeDetails m={m} c={sel} onExplore={onExplore} /> : <p className="text-xs text-muted-foreground">Select a device.</p>}</Panel>
      </div>
      <Panel title="Layer 2 Mapping" info="Device ↔ switch port connections, MAC and VLAN membership from CMDB L2 relationships.">
        <Table head={["Device", "Interface / Port", "MAC Address", "VLAN", "Switch", "Switch Port", "Connection", "Link Status"]}>
          {l2Rows.map((r) => {
            const a = m.byId.get(r.source_id)!, b = m.byId.get(r.target_id)!;
            return (
              <tr key={r.id}>
                <Td className="font-medium">{a.name}</Td><Td>{r.source_port}</Td><Td className="font-mono">{a.mac_address}</Td><Td>{vlanOf(a.id) || a.vlan}</Td>
                <Td>{b.name}</Td><Td>{r.target_port}</Td><Td>{r.rel_type}</Td>
                <Td><Badge className={`border-0 ${r.link_status === "up" ? "bg-[color:var(--color-success)]/20 text-[color:var(--color-success)]" : "bg-[color:var(--color-destructive)]/20 text-[color:var(--color-destructive)]"}`}>{r.link_status}</Badge></Td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <Panel title="Layer 3 Mapping" info="IP addressing, subnet, gateway and routing relationships from CMDB L3 relationships.">
        <Table head={["Device", "IP Address", "Subnet", "Gateway", "VLAN", "Routing Relationship", "Network Zone", "Interface"]}>
          {l3Devices.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.name}</Td><Td className="font-mono">{c.ip_address}</Td><Td className="font-mono">{c.subnet}</Td><Td className="font-mono">{c.gateway}</Td>
              <Td>{c.vlan}</Td><Td>{routing(c.id) || null}</Td><Td>{c.network_zone}</Td>
              <Td>{(m.out.get(c.id) ?? []).find((r) => r.source_port)?.source_port}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

/* ---------------- 9. Relationship explorer ---------------- */
function Explorer({ m, ci, onClose, onAssign }: { m: Model; ci: CI | null; onClose: () => void; onAssign: (c: CI) => void }) {
  const live = ci ? m.byId.get(ci.id) ?? ci : null;
  const up = live ? m.walk(live.id, "up") : [];
  const down = live ? m.walk(live.id, "down") : [];
  const x = live ? m.ctx.get(live.id) : null;
  const List = ({ items }: { items: typeof up }) =>
    items.length ? (
      <ul className="text-xs space-y-1">
        {items.map((i) => (
          <li key={i.ci.id} style={{ paddingLeft: (i.depth - 1) * 12 }}>
            <span className="text-muted-foreground">{i.via.rel_type} →</span> {i.ci.name} <span className="text-muted-foreground">· {CLASS_LABEL[i.ci.ci_class]}</span>
          </li>
        ))}
      </ul>
    ) : <p className="text-xs text-muted-foreground">None</p>;
  const tech = down.filter((d) => isTech(d.ci) || d.ci.ci_class === "vlan" || d.ci.ci_class === "subnet");
  return (
    <Sheet open={!!live} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto dark bg-background text-foreground">
        {live && x && (
          <>
            <SheetHeader><SheetTitle>Explore Relationships · {live.name}</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4 px-1">
              <div className="flex flex-wrap gap-2"><Badge variant="outline">{CLASS_LABEL[live.ci_class]}</Badge><Crit v={live.criticality} /><Badge variant="outline">{ownerStatus(live)}</Badge>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onAssign(live)}>Assign Owner</Button></div>
              <Panel title="Business Impact" info="Business Services and sub-services affected if this CI fails.">
                <div className="text-xs space-y-1">
                  <div><span className="text-muted-foreground">Business Service →</span> {x.businessServices.join(", ") || "—"}</div>
                  <div><span className="text-muted-foreground">Sub-Business Service →</span> {x.subServices.join(", ") || "—"}</div>
                  <div><span className="text-muted-foreground">System →</span> {x.systems.join(", ") || "—"}</div>
                  <div><span className="text-muted-foreground">Technology Layer →</span> {x.technology.join(", ") || "—"}</div>
                </div>
              </Panel>
              <Panel title="Technology Asset Details" info="Asset data model and capacity metrics (supporting technology resources).">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {([["Category", live.asset_category], ["Type", live.asset_type], ["Hostname", live.hostname], ["IP", live.ip_address], ["Data Center", live.data_center], ["Vendor", live.vendor], ["Model", live.model], ["Serial", live.serial_number], ["OS", live.operating_system], ["Version", live.version], ["Installed", live.installation_date], ["Lifecycle", live.lifecycle_status], ["Support Team", live.support_team], ["Last Updated", live.updated_at?.slice(0, 10)]] as [string, string | null][]).map(([k, v]) => (
                    <div key={k}><span className="text-muted-foreground">{k}: </span>{v || "—"}</div>
                  ))}
                  {Object.entries((live.capacity ?? {}) as Record<string, number>).map(([k, v]) => (
                    <div key={k}><span className="text-muted-foreground">{k.replace(/_/g, " ")}: </span>{String(v)}</div>
                  ))}
                  {live.vlan && <div><span className="text-muted-foreground">Network →</span> {live.vlan}</div>}
                </div>
              </Panel>
              <Panel title={`Upstream Dependencies (${up.length})`} info="What depends on this CI."><List items={up} /></Panel>
              <Panel title={`Downstream Dependencies (${down.length})`} info="What this CI depends on."><List items={down} /></Panel>
              <Panel title={`Technical Dependencies (${tech.length})`}><List items={tech} /></Panel>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
