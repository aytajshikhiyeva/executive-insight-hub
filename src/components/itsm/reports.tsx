import { useState } from "react";
import { Panel, Stat } from "./Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, FileText, Mail } from "lucide-react";
import { METRICS } from "@/lib/itsm-metrics";
import { kpis, perf, topRisks, highRiskChanges, insights, actions } from "@/lib/itsm-data";
import { toast } from "sonner";

type Format = "pdf" | "html" | "csv" | "email";

export function ReportsSection() {
  const [period, setPeriod] = useState("30d");
  const [audience, setAudience] = useState<"board" | "cio" | "ops">("board");

  const printReport = () => window.print();

  const downloadHtml = () => {
    const html = buildHtmlReport(period, audience);
    const blob = new Blob([html], { type: "text/html" });
    triggerDownload(blob, `itsm-executive-report-${period}.html`);
  };
  const downloadCsv = () => {
    const rows = [
      ["Metric", "Value", "Target", "Meaning", "PostgreSQL"],
      ["Total Incidents", kpis.totalIncidents, "-", "Volume KPI", METRICS.find(m=>m.id==="total_incidents")!.sql],
      ["Open Incidents", kpis.openIncidents, "-", "Backlog", METRICS.find(m=>m.id==="open_incidents")!.sql],
      ["Major Incidents (P1)", kpis.majorIncidents, "0", "Executive alert", METRICS.find(m=>m.id==="major_incidents")!.sql],
      ["SLA Compliance %", kpis.slaCompliance, ">= 95", "SLA KPI", METRICS.find(m=>m.id==="sla_compliance")!.sql],
      ["Change Success %", perf.changeSuccess.pct, ">= 95", "Change KPI", METRICS.find(m=>m.id==="change_success")!.sql],
      ["Emergency Change %", perf.emergency.pct, "< 5", "CAB bypass", METRICS.find(m=>m.id==="emergency_change")!.sql],
      ["MTTD Auto (min)", perf.mttdAuto.avgMin, "< 5", "Monitoring detect", METRICS.find(m=>m.id==="mttd")!.sql],
      ["MTTR NH (h)", perf.mttrNH.avgHr, "< 4", "Non-working resolve", METRICS.find(m=>m.id==="mttr")!.sql],
      ["CMDB Coverage %", kpis.cmdbCoverage, ">= 95", "Data quality", METRICS.find(m=>m.id==="cmdb_coverage")!.sql],
      ["Risk Score", kpis.riskScore, "< 40", "Operational risk", METRICS.find(m=>m.id==="risk_score")!.sql],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    triggerDownload(new Blob([csv], { type: "text/csv" }), `itsm-executive-report-${period}.csv`);
  };
  const emailReport = () => {
    toast.success("Executive report queued", {
      description: `Delivery to aytaj.shikhiyeva@pashabank.az · ${audience.toUpperCase()} · ${period}`,
    });
  };

  const doExport = (f: Format) => {
    if (f === "pdf") printReport();
    if (f === "html") downloadHtml();
    if (f === "csv") downloadCsv();
    if (f === "email") emailReport();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Executive Reports</h2>
        <span className="text-xs text-muted-foreground">Board-ready ITSM report · PDF / HTML / CSV / Email</span>
      </div>

      <Panel title="Report Options">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <span className="grafana-title">Period</span>
            <div className="flex gap-1">
              {["7d", "30d", "90d", "365d"].map((p) => (
                <Button key={p} size="sm" variant={period === p ? "default" : "outline"} className="h-8" onClick={() => setPeriod(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="grafana-title">Audience</span>
            <div className="flex gap-1">
              {(["board", "cio", "ops"] as const).map((a) => (
                <Button key={a} size="sm" variant={audience === a ? "default" : "outline"} className="h-8 uppercase" onClick={() => setAudience(a)}>
                  {a}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="grafana-title">Export</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="h-8 gap-1.5" onClick={() => doExport("pdf")}><Printer className="h-3.5 w-3.5" />PDF (Print)</Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => doExport("html")}><FileText className="h-3.5 w-3.5" />HTML</Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => doExport("csv")}><Download className="h-3.5 w-3.5" />CSV</Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => doExport("email")}><Mail className="h-3.5 w-3.5" />Email</Button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="grafana-title">Schedule</span>
            <div className="text-xs text-muted-foreground">Auto-send: <b className="text-foreground">Mon 08:00</b> weekly, <b className="text-foreground">1st of month 08:00</b> monthly</div>
          </div>
        </div>
      </Panel>

      {/* Printable report body */}
      <div id="exec-report" className="space-y-4 print:space-y-3">
        <Panel title={`ITSM Executive Report · ${period.toUpperCase()} · ${audience.toUpperCase()}`}>
          <div className="text-sm text-muted-foreground mb-3">Enterprise Banking · Data source: PostgreSQL (Jira + CMDB) · Generated {new Date().toLocaleString()}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total Incidents" value={kpis.totalIncidents.toLocaleString()} sub={period} />
            <Stat label="Major P1" value={kpis.majorIncidents} tone="danger" />
            <Stat label="SLA Compliance" value={kpis.slaCompliance} suffix="%" tone="success" />
            <Stat label="Change Success" value={perf.changeSuccess.pct} suffix="%" tone="success" />
            <Stat label="Emergency Change" value={perf.emergency.pct} suffix="%" tone="warning" />
            <Stat label="MTTD Auto" value={perf.mttdAuto.avgMin} suffix="min" tone="success" />
            <Stat label="MTTR NH" value={perf.mttrNH.avgHr} suffix="h" tone="warning" />
            <Stat label="Risk Score" value={kpis.riskScore} suffix="/100" tone={kpis.riskScore < 40 ? "success" : "warning"} />
          </div>
        </Panel>

        <Panel title="Executive Commentary">
          <ul className="space-y-2 text-sm">
            {insights.slice(0, 6).map((i, idx) => (
              <li key={idx} className="flex gap-2">
                <Badge className="bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)] border-0 uppercase text-[10px]">{i.type}</Badge>
                <div><b>{i.title}</b> — <span className="text-muted-foreground">{i.body}</span></div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Top Operational Risks">
          <ol className="space-y-1 text-sm list-decimal pl-5">
            {topRisks.slice(0, 5).map((r) => (
              <li key={r.rank}><b>{r.risk}</b> <span className="text-muted-foreground">— {r.service} · score {r.score}</span></li>
            ))}
          </ol>
        </Panel>

        <Panel title="Upcoming High-Risk Changes">
          <ul className="space-y-1 text-sm">
            {highRiskChanges.map((c) => (
              <li key={c.id}><span className="font-mono text-[color:var(--color-info)]">{c.id}</span> — {c.title} <span className="text-muted-foreground">· {c.risk} · {c.window} · {c.owner}</span></li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recommended Actions (Next CAB)">
          <ol className="space-y-1 text-sm list-decimal pl-5">
            {actions.slice(0, 6).map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </Panel>
      </div>

      <Panel title="Metric Catalog · PostgreSQL Scripts & Definitions" info="Every KPI on this dashboard with its SQL query and business meaning.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <th className="px-2 py-2">Metric</th>
                <th className="px-2 py-2">Target</th>
                <th className="px-2 py-2">Meaning</th>
                <th className="px-2 py-2">PostgreSQL</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => (
                <tr key={m.id} className="border-b border-border/50 align-top">
                  <td className="px-2 py-2 font-medium whitespace-nowrap">{m.label}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{m.target ?? "-"}</td>
                  <td className="px-2 py-2 text-muted-foreground">{m.meaning}</td>
                  <td className="px-2 py-2">
                    <pre className="bg-[color:var(--color-panel)] text-[11px] p-2 rounded overflow-x-auto whitespace-pre-wrap break-words max-w-[520px]">{m.sql}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Downloaded ${filename}`);
}

function buildHtmlReport(period: string, audience: string) {
  const rows = METRICS.map((m) => `<tr><td><b>${m.label}</b></td><td>${m.target ?? "-"}</td><td>${m.meaning}</td><td><pre>${m.sql}</pre></td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>ITSM Executive Report</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0b0f16;padding:24px;max-width:960px;margin:auto}
h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:12px} td,th{border:1px solid #ddd;padding:6px;vertical-align:top;text-align:left}
pre{background:#f5f5f7;padding:6px;font-size:11px;white-space:pre-wrap;margin:0} .kpi{display:inline-block;margin:6px 12px 0 0}
.kpi b{font-size:18px;display:block}</style></head>
<body><h1>ITSM Executive Report</h1><div>Period: ${period} · Audience: ${audience.toUpperCase()} · Generated ${new Date().toLocaleString()}</div>
<h2>Headline KPIs</h2>
<div class="kpi"><b>${kpis.totalIncidents}</b>Total Incidents</div>
<div class="kpi"><b>${kpis.majorIncidents}</b>Major P1</div>
<div class="kpi"><b>${kpis.slaCompliance}%</b>SLA Compliance</div>
<div class="kpi"><b>${perf.changeSuccess.pct}%</b>Change Success</div>
<div class="kpi"><b>${perf.emergency.pct}%</b>Emergency Change</div>
<div class="kpi"><b>${perf.mttrNH.avgHr}h</b>MTTR NH</div>
<div class="kpi"><b>${kpis.riskScore}/100</b>Risk Score</div>
<h2>Top Risks</h2><ol>${topRisks.slice(0,5).map(r=>`<li><b>${r.risk}</b> — ${r.service} · score ${r.score}</li>`).join("")}</ol>
<h2>Upcoming High-Risk Changes</h2><ul>${highRiskChanges.map(c=>`<li>${c.id} — ${c.title} · ${c.risk} · ${c.window} · ${c.owner}</li>`).join("")}</ul>
<h2>Recommended Actions</h2><ol>${actions.slice(0,6).map(a=>`<li>${a}</li>`).join("")}</ol>
<h2>Metric Catalog (PostgreSQL)</h2>
<table><thead><tr><th>Metric</th><th>Target</th><th>Meaning</th><th>SQL</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}
