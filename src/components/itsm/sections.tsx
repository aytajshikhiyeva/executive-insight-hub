import { Panel, Stat, TrendPill } from "./Panel";
import { Bars, Donut, Gauge, Line1, TimeSeries } from "./charts";
import {
  kpis, incidentTrend, severity, slaBySvc, incidentsByGroup, incidentsByService, aging,
  changeTrend, cabStatus, highRiskChanges, assetLifecycle, assetOwnership, riskHeatmap, topRisks,
  perf, coreBankingTrends, cardSystemsTrends, insights, actions, improvements,
} from "@/lib/itsm-data";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Info, Minus, TrendingUp } from "lucide-react";

const COL_INC = "var(--color-chart-1)";
const COL_CHG = "var(--color-chart-2)";
const COL_ERR = "var(--color-destructive)";
const COL_WARN = "var(--color-warning)";
const COL_OK = "var(--color-success)";

/* --------------------- SECTION 1 --------------------- */

export function OverviewSection() {
  const scoreTone = (s: number) => (s >= 85 ? "success" : s >= 70 ? "warning" : "danger");
  const riskTone = (s: number) => (s < 40 ? "success" : s < 65 ? "warning" : "danger");
  return (
    <div className="space-y-4">
      <SectionHeader title="Executive Summary" subtitle="ITIL v4 KPIs · realtime · executive board view" />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Stat label="Total Incidents" value={kpis.totalIncidents.toLocaleString()} trend={-2.1} sub="30d" />
        <Stat label="Open Incidents" value={kpis.openIncidents} tone="warning" trend={+3.4} sub="vs prev" />
        <Stat label="Closed Incidents" value={kpis.closedIncidents.toLocaleString()} tone="success" trend={-1.9} />
        <Stat label="Major Incidents" value={kpis.majorIncidents} tone="danger" trend={+1.0} sub="P1/P2" />
        <Stat label="Total Changes" value={kpis.totalChanges.toLocaleString()} trend={+4.5} />
        <Stat label="Successful Changes" value={kpis.successfulChanges.toLocaleString()} tone="success" trend={+1.2} />
        <Stat label="Failed Changes" value={kpis.failedChanges} tone="danger" trend={-0.8} />
        <Stat label="Emergency Changes" value={kpis.emergencyChanges} tone="warning" trend={+6.2} sub="MoM" />
        <Stat label="Active Assets" value={kpis.activeAssets.toLocaleString()} trend={+0.4} />
        <Stat label="Critical Assets" value={kpis.criticalAssets.toLocaleString()} tone="warning" />
        <Stat label="CMDB Coverage" value={`${kpis.cmdbCoverage}`} suffix="%" tone="success" trend={+0.6} />
        <Stat label="SLA Compliance" value={`${kpis.slaCompliance}`} suffix="%" tone="success" trend={+0.3} />
        <Stat label="Service Health" value={kpis.healthScore} suffix="/100" tone={scoreTone(kpis.healthScore)} />
        <Stat label="Risk Score" value={kpis.riskScore} suffix="/100" tone={riskTone(kpis.riskScore)} trend={-2.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="Overall Service Health" className="lg:col-span-1">
          <Gauge value={kpis.healthScore} label="health" color="var(--color-success)" />
          <div className="grid grid-cols-3 text-center text-xs">
            <div><div className="text-[color:var(--color-success)] font-semibold">99.87%</div><div className="text-muted-foreground">Availability</div></div>
            <div><div className="text-[color:var(--color-info)] font-semibold">96.4%</div><div className="text-muted-foreground">SLA</div></div>
            <div><div className="text-[color:var(--color-warning)] font-semibold">42</div><div className="text-muted-foreground">Risk</div></div>
          </div>
        </Panel>
        <Panel title="Incident Volume (30d)" className="lg:col-span-2">
          <TimeSeries
            data={incidentTrend}
            series={[
              { key: "P1", color: COL_ERR, name: "P1" },
              { key: "P2", color: COL_WARN, name: "P2" },
              { key: "P3", color: COL_INC, name: "P3" },
              { key: "P4", color: COL_OK, name: "P4" },
            ]}
            stacked
          />
        </Panel>
      </div>
    </div>
  );
}

export function IncidentSection() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Incident Management" subtitle="Jira · Priority, SLA, Aging, Assignment" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="Severity Distribution"><Donut data={severity} /></Panel>
        <Panel title="Incident Trend (30d)" className="lg:col-span-2">
          <TimeSeries data={incidentTrend} series={[
            { key: "resolved", color: COL_OK, name: "Resolved" },
            { key: "P2", color: COL_WARN, name: "P2 Opened" },
            { key: "P1", color: COL_ERR, name: "P1 Opened" },
          ]} />
        </Panel>

        <Panel title="SLA Compliance by Service" className="lg:col-span-2">
          <Bars data={slaBySvc} xKey="service" series={[
            { key: "sla", color: COL_OK, name: "SLA %" },
            { key: "breach", color: COL_ERR, name: "Breaches" },
          ]} />
        </Panel>
        <Panel title="Aging Incidents">
          <Bars data={aging} xKey="bucket" series={[{ key: "count", color: COL_WARN, name: "Open" }]} height={220} />
        </Panel>

        <Panel title="Incidents by Assignment Group" className="lg:col-span-2">
          <Bars data={incidentsByGroup} xKey="group" layout="vertical" series={[
            { key: "open", color: COL_WARN, name: "Open", stackId: "a" },
            { key: "closed", color: COL_OK, name: "Closed", stackId: "a" },
            { key: "recurring", color: COL_ERR, name: "Recurring", stackId: "a" },
          ]} height={280} />
        </Panel>
        <Panel title="Incidents by Service">
          <Bars data={incidentsByService.slice(0, 8)} xKey="service" layout="vertical" series={[
            { key: "count", color: COL_INC, name: "Incidents" },
          ]} height={280} />
        </Panel>
      </div>
    </div>
  );
}

export function ChangeSection() {
  const successRate = ((kpis.successfulChanges / kpis.totalChanges) * 100).toFixed(1);
  const failRate = ((kpis.failedChanges / kpis.totalChanges) * 100).toFixed(1);
  return (
    <div className="space-y-4">
      <SectionHeader title="Change Management" subtitle="Jira · CAB · Success / Failure / Emergency" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Change Success Rate" value={successRate} suffix="%" tone="success" trend={+1.2} />
        <Stat label="Change Failure Rate" value={failRate} suffix="%" tone="danger" trend={-0.8} />
        <Stat label="Emergency Changes" value={kpis.emergencyChanges} tone="warning" trend={+6.2} sub="MoM" />
        <Stat label="Pending CAB" value={24} tone="info" sub="next window" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="Successful vs Failed vs Emergency (12mo)" className="lg:col-span-2">
          <Bars data={changeTrend} xKey="month" series={[
            { key: "success", color: COL_OK, name: "Success", stackId: "a" },
            { key: "failed", color: COL_ERR, name: "Failed", stackId: "a" },
            { key: "emergency", color: COL_WARN, name: "Emergency", stackId: "a" },
          ]} />
        </Panel>
        <Panel title="CAB Approval Status"><Donut data={cabStatus} /></Panel>

        <Panel title="High-Risk Changes · Change Calendar" className="lg:col-span-3" padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-3 py-2">Change ID</th><th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Risk</th><th className="px-3 py-2">CAB</th>
                <th className="px-3 py-2">Window</th><th className="px-3 py-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {highRiskChanges.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono text-xs text-[color:var(--color-info)]">
                    <a className="hover:underline" href="#">{c.id}</a>
                  </td>
                  <td className="px-3 py-2">{c.title}</td>
                  <td className="px-3 py-2"><RiskBadge risk={c.risk} /></td>
                  <td className="px-3 py-2"><CabBadge status={c.cab} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{c.window}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

export function AssetSection() {
  const unsupported = 312, eol = 836, freshness = 91.4, compliance = 88.6;
  return (
    <div className="space-y-4">
      <SectionHeader title="Configuration & Asset Management" subtitle="CMDB · Lifecycle · Criticality · Freshness" />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <Stat label="Total Assets" value={kpis.activeAssets.toLocaleString()} />
        <Stat label="Critical Assets" value={kpis.criticalAssets.toLocaleString()} tone="warning" />
        <Stat label="CMDB Coverage" value={kpis.cmdbCoverage} suffix="%" tone="success" />
        <Stat label="Data Freshness" value={freshness} suffix="%" tone="warning" trend={-0.4} />
        <Stat label="Config Compliance" value={compliance} suffix="%" tone="warning" trend={+0.7} />
        <Stat label="Unsupported / EOL" value={`${unsupported} / ${eol}`} tone="danger" sub="assets" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="Asset Lifecycle"><Donut data={assetLifecycle.map(a => ({ name: a.stage, value: a.count, color: a.color }))} /></Panel>
        <Panel title="Asset Ownership" className="lg:col-span-2">
          <Bars data={assetOwnership} xKey="team" series={[{ key: "assets", color: COL_INC, name: "Assets" }]} />
        </Panel>
      </div>
    </div>
  );
}

export function RiskSection() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Executive Risk Dashboard" subtitle="Failed changes · Recurring incidents · High-risk assets" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="Risk Heatmap · Service × Category" className="lg:col-span-2" padded={false}>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left px-2 py-1"></th>
                  {["Availability","Change","Security","Capacity","SLA","Vendor"].map(c => (
                    <th key={c} className="px-2 py-1 text-center">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskHeatmap.map((row) => (
                  <tr key={row.service}>
                    <td className="px-2 py-1 whitespace-nowrap text-muted-foreground">{row.service}</td>
                    {row.cells.map((c) => (
                      <td key={c.cat} className="px-1 py-1">
                        <div className="h-8 rounded flex items-center justify-center font-mono text-[11px]"
                          style={{ background: heatColor(c.value), color: c.value > 60 ? "#0b0f16" : "#fff" }}>
                          {c.value}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Overall Risk / Health">
          <div className="flex flex-col gap-3">
            <Gauge value={kpis.riskScore} label="risk" color="var(--color-warning)" height={140} />
            <div className="grid grid-cols-3 text-center text-xs">
              <div><div className="text-[color:var(--color-destructive)] font-semibold">7</div><div className="text-muted-foreground">SLA Breach Risk</div></div>
              <div><div className="text-[color:var(--color-warning)] font-semibold">38</div><div className="text-muted-foreground">Aging Inc.</div></div>
              <div><div className="text-[color:var(--color-info)] font-semibold">12</div><div className="text-muted-foreground">Critical Svcs</div></div>
            </div>
          </div>
        </Panel>

        <Panel title="Top 10 Operational Risks" className="lg:col-span-3" padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-3 py-2">#</th><th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Service</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {topRisks.map((r) => (
                <tr key={r.rank} className="border-b border-border/50 hover:bg-accent/40">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.rank}</td>
                  <td className="px-3 py-2">{r.risk}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.service}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded bg-accent overflow-hidden">
                        <div className="h-full" style={{ width: `${r.score}%`, background: heatColor(r.score) }} />
                      </div>
                      <span className="tabular-nums text-xs">{r.score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {r.trend === "up" ? <ArrowUp className="h-4 w-4 text-[color:var(--color-destructive)]" /> :
                     r.trend === "down" ? <ArrowDown className="h-4 w-4 text-[color:var(--color-success)]" /> :
                     <Minus className="h-4 w-4 text-muted-foreground" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------- SECTION 2: IT PERFORMANCE MANAGEMENT --------------------- */

export function PerformanceSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="IT Performance Management" subtitle="Executive Board · Stat panels · Vertical layout" />

      {/* Success Change Rate */}
      <PerfRow title="Success Change Rate">
        <Stat label="Success %" value={perf.changeSuccess.pct} suffix="%" tone="success" trend={perf.changeSuccess.trend} />
        <Stat label="Success Count" value={perf.changeSuccess.count.toLocaleString()} tone="success" />
        <Stat label="Failed %" value={perf.changeFailed.pct} suffix="%" tone="danger" trend={perf.changeFailed.trend} />
        <Stat label="Failed Count" value={perf.changeFailed.count} tone="danger" />
      </PerfRow>

      <PerfRow title="Repeated Incident Rate">
        <Stat label="Internal %" value={perf.repeatedInternal.pct} suffix="%" tone="warning" trend={perf.repeatedInternal.trend} />
        <Stat label="Internal Count" value={perf.repeatedInternal.count} tone="warning" />
        <Stat label="3rd Party %" value={perf.repeatedThirdParty.pct} suffix="%" tone="warning" trend={perf.repeatedThirdParty.trend} />
        <Stat label="3rd Party Count" value={perf.repeatedThirdParty.count} tone="warning" />
      </PerfRow>

      <PerfRow title="Emergency Change Rate">
        <Stat label="Emergency %" value={perf.emergency.pct} suffix="%" tone="warning" trend={perf.emergency.monthly} sub="monthly" />
        <Stat label="Emergency Count" value={perf.emergency.count} tone="warning" />
        <Stat label="Monthly Trend" value={`${perf.emergency.monthly > 0 ? "+" : ""}${perf.emergency.monthly}`} suffix="%" tone="danger" />
        <Stat label="Quarterly Trend" value={`${perf.emergency.quarterly > 0 ? "+" : ""}${perf.emergency.quarterly}`} suffix="%" tone="danger" />
      </PerfRow>

      <PerfRow title="MTTD · Mean Time To Detect">
        <MttGroup
          label="Auto Detection (PRTG)"
          avg={perf.mttdAuto.avgMin} unit="min" trend={perf.mttdAuto.trend}
          target={perf.mttdAuto.target} actual={perf.mttdAuto.actual}
          tone={perf.mttdAuto.actual <= perf.mttdAuto.target ? "success" : "danger"}
        />
        <MttGroup
          label="Manual Detection (Employee)"
          avg={perf.mttdManual.avgMin} unit="min" trend={perf.mttdManual.trend}
          target={perf.mttdManual.target} actual={perf.mttdManual.actual}
          tone={perf.mttdManual.actual <= perf.mttdManual.target ? "success" : "danger"}
        />
      </PerfRow>

      <PerfRow title="MTTA · Mean Time To Acknowledge">
        <MttGroup label="Working Hours" avg={perf.mttaWH.avgMin} unit="min" trend={perf.mttaWH.trend}
          target={perf.mttaWH.target} actual={perf.mttaWH.avgMin}
          tone={perf.mttaWH.avgMin <= perf.mttaWH.target ? "success" : "danger"} />
        <MttGroup label="Non-Working Hours" avg={perf.mttaNH.avgMin} unit="min" trend={perf.mttaNH.trend}
          target={perf.mttaNH.target} actual={perf.mttaNH.avgMin}
          tone={perf.mttaNH.avgMin <= perf.mttaNH.target ? "success" : "danger"} />
      </PerfRow>

      <PerfRow title="MTTR · Mean Time To Resolve">
        <MttGroup label="Working Hours" avg={perf.mttrWH.avgHr} unit="hr" trend={perf.mttrWH.trend}
          target={perf.mttrWH.target} actual={perf.mttrWH.avgHr}
          tone={perf.mttrWH.avgHr <= perf.mttrWH.target ? "success" : "danger"} />
        <MttGroup label="Non-Working Hours" avg={perf.mttrNH.avgHr} unit="hr" trend={perf.mttrNH.trend}
          target={perf.mttrNH.target} actual={perf.mttrNH.avgHr}
          tone={perf.mttrNH.avgHr <= perf.mttrNH.target ? "success" : "danger"} />
      </PerfRow>
    </div>
  );
}

function PerfRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1 w-8 rounded bg-[color:var(--color-primary)]" />
        <h4 className="text-sm font-semibold tracking-wide">{title}</h4>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

function MttGroup({ label, avg, unit, trend, target, actual, tone }: {
  label: string; avg: number; unit: string; trend: number; target: number; actual: number; tone: "success" | "danger" | "warning";
}) {
  const pct = Math.min(100, (target / Math.max(actual, target)) * 100);
  const met = actual <= target;
  return (
    <div className="panel p-3 col-span-2">
      <div className="grafana-title mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Average</div>
          <div className="text-2xl font-semibold tabular-nums" style={{ color: `var(--color-${tone === "success" ? "success" : tone === "warning" ? "warning" : "destructive"})` }}>
            {avg}<span className="text-sm text-muted-foreground ml-1">{unit}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Trend</div>
          <div className="text-2xl font-semibold"><TrendPill value={trend} unit={unit} /></div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Target vs Actual</div>
          <div className="text-sm tabular-nums mt-1">
            <span className={met ? "text-[color:var(--color-success)]" : "text-[color:var(--color-destructive)]"}>
              {actual}{unit}
            </span>
            <span className="text-muted-foreground"> / target {target}{unit}</span>
          </div>
          <div className="mt-2 h-1.5 rounded bg-accent overflow-hidden">
            <div className="h-full" style={{ width: `${pct}%`, background: met ? "var(--color-success)" : "var(--color-destructive)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- TREND ANALYSIS --------------------- */

const TREND_ITEMS: { key: keyof typeof coreBankingTrends; label: string; color: string; unit?: string }[] = [
  { key: "incident", label: "Incident Trend", color: COL_INC },
  { key: "change", label: "Change Trend", color: COL_CHG },
  { key: "availability", label: "Availability", color: COL_OK, unit: "%" },
  { key: "mttd", label: "MTTD", color: "var(--color-chart-5)", unit: "min" },
  { key: "mtta", label: "MTTA", color: "var(--color-chart-3)", unit: "min" },
  { key: "mttr", label: "MTTR", color: COL_WARN, unit: "hr" },
  { key: "failed", label: "Failed Changes", color: COL_ERR },
  { key: "emergency", label: "Emergency Changes", color: COL_WARN },
  { key: "sla", label: "SLA", color: COL_OK, unit: "%" },
];

export function TrendAnalysisSection() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Trend Analysis" subtitle="Core Banking vs Card Systems · executive view" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TrendGroup title="Core Banking Systems" data={coreBankingTrends} tone="info" />
        <TrendGroup title="Card Systems" data={cardSystemsTrends} tone="warning" />
      </div>
    </div>
  );
}

function TrendGroup({ title, data, tone }: { title: string; data: any; tone: string }) {
  return (
    <Panel title={title}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TREND_ITEMS.map((t) => {
          const series = data[t.key];
          const last = series[series.length - 1].value;
          const first = series[0].value;
          const delta = ((last - first) / first) * 100;
          return (
            <div key={t.key} className="panel p-2">
              <div className="flex items-center justify-between">
                <div className="grafana-title">{t.label}</div>
                <TrendPill value={+delta.toFixed(1)} />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-semibold tabular-nums" style={{ color: t.color }}>{last}</span>
                {t.unit && <span className="text-[10px] text-muted-foreground">{t.unit}</span>}
              </div>
              <Line1 data={series} color={t.color} height={44} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* --------------------- INSIGHTS --------------------- */

export function InsightsSection() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Executive Insights" subtitle="AI-assisted ITSM commentary · next-CAB priorities" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {insights.map((i, idx) => <InsightCard key={idx} {...i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel title="Recommended Actions · Next CAB">
          <ol className="space-y-2 text-sm">
            {actions.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)] text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Top 10 Improvement Opportunities">
          <ol className="space-y-2 text-sm">
            {improvements.map((a, i) => (
              <li key={i} className="flex gap-3">
                <TrendingUp className="h-4 w-4 mt-0.5 text-[color:var(--color-success)] shrink-0" />
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function InsightCard({ type, title, body }: { type: string; title: string; body: string }) {
  const map: Record<string, any> = {
    success: { icon: CheckCircle2, color: "var(--color-success)" },
    warning: { icon: AlertTriangle, color: "var(--color-warning)" },
    danger:  { icon: AlertTriangle, color: "var(--color-destructive)" },
    info:    { icon: Info, color: "var(--color-info)" },
  };
  const { icon: Icon, color } = map[type] ?? map.info;
  return (
    <div className="panel p-3 flex gap-3 border-l-4" style={{ borderLeftColor: color }}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color }} />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

/* --------------------- helpers --------------------- */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    Low: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
    Medium: "bg-[color:var(--color-info)]/15 text-[color:var(--color-info)]",
    High: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
    Critical: "bg-[color:var(--color-destructive)]/15 text-[color:var(--color-destructive)]",
  };
  return <Badge className={`${map[risk] ?? ""} border-0 font-medium`}>{risk}</Badge>;
}

function CabBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Approved: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
    Pending: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
    Rejected: "bg-[color:var(--color-destructive)]/15 text-[color:var(--color-destructive)]",
    Deferred: "bg-[color:var(--color-info)]/15 text-[color:var(--color-info)]",
  };
  return <Badge className={`${map[status] ?? ""} border-0 font-medium`}>{status}</Badge>;
}

function heatColor(v: number) {
  // 0..100 → green → amber → red
  if (v < 33) return `oklch(0.55 0.18 155 / ${0.35 + v / 100})`;
  if (v < 66) return `oklch(0.7 0.17 75 / ${0.4 + v / 150})`;
  return `oklch(0.6 0.22 25 / ${0.5 + v / 200})`;
}
