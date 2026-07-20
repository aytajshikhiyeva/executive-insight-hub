import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity, AlertTriangle, Bell, Boxes, Download, FileText, GitPullRequestArrow, LayoutDashboard, ListTree,
  RefreshCw, Shield, Sparkles, TrendingUp,
} from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  OverviewSection, IncidentSection, ChangeSection, AssetSection, RiskSection,
  PerformanceSection, TrendAnalysisSection, InsightsSection,
} from "@/components/itsm/sections";
import { AlertingSection } from "@/components/itsm/alerting";
import { ReportsSection } from "@/components/itsm/reports";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ITSM Executive Dashboard · Enterprise Banking" },
      { name: "description", content: "Enterprise ITSM performance dashboard with ITIL v4 KPIs, incident/change analytics, CMDB insights, SLA & risk views for executive board reporting." },
      { property: "og:title", content: "ITSM Executive Dashboard" },
      { property: "og:description", content: "Grafana-style enterprise ITSM dashboard for executive board reporting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
  { id: "changes", label: "Changes", icon: GitPullRequestArrow },
  { id: "assets", label: "CMDB / Assets", icon: Boxes },
  { id: "risk", label: "Risk", icon: Shield },
  { id: "performance", label: "IT Performance", icon: Activity },
  { id: "trends", label: "Trend Analysis", icon: TrendingUp },
  { id: "insights", label: "Executive Insights", icon: Sparkles },
  { id: "alerting", label: "Alerting", icon: Bell },
] as const;


type TabId = (typeof NAV)[number]["id"];

function DashboardPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [range, setRange] = useState("30d");
  const [service, setService] = useState("all");
  const [severity, setSeverity] = useState("all");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-[color:var(--color-sidebar)] min-h-[calc(100vh-56px)]">
          <div className="px-3 py-4 grafana-title">Navigation</div>
          <nav className="flex flex-col gap-0.5 px-2 pb-4">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = tab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setTab(n.id)}
                  className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm text-left transition-colors ${
                    active ? "bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]" : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-auto p-3 text-[10px] text-muted-foreground border-t border-border">
            <div>Data · Jira + CMDB (demo)</div>
            <div>ITIL v4 · Grafana style</div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <FilterBar
            range={range} setRange={setRange}
            service={service} setService={setService}
            severity={severity} setSeverity={setSeverity}
          />

          {/* mobile nav */}
          <div className="lg:hidden overflow-x-auto border-b border-border bg-[color:var(--color-sidebar)]">
            <div className="flex gap-1 px-2 py-2">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = tab === n.id;
                return (
                  <button key={n.id} onClick={() => setTab(n.id)}
                    className={`whitespace-nowrap flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
                      active ? "bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]" : "text-muted-foreground"
                    }`}>
                    <Icon className="h-3.5 w-3.5" />{n.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 lg:p-6 space-y-6">
            {tab === "overview" && <OverviewSection />}
            {tab === "incidents" && <IncidentSection />}
            {tab === "changes" && <ChangeSection />}
            {tab === "assets" && <AssetSection />}
            {tab === "risk" && <RiskSection />}
            {tab === "performance" && <PerformanceSection />}
            {tab === "trends" && <TrendAnalysisSection />}
            {tab === "insights" && <InsightsSection />}
            {tab === "alerting" && <AlertingSection />}

          </div>
          <footer className="border-t border-border px-4 lg:px-6 py-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
            <span>ITSM Executive Dashboard · demo data · Enterprise Banking</span>
            <span>Refreshed {new Date().toLocaleTimeString()}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-[color:var(--color-sidebar)]/95 backdrop-blur flex items-center gap-3 px-4">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded bg-[color:var(--color-primary)]/20 grid place-items-center">
          <ListTree className="h-4 w-4 text-[color:var(--color-primary)]" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">ITSM Executive Dashboard</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Enterprise Banking · ITIL v4</div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge className="bg-[color:var(--color-success)]/15 text-[color:var(--color-success)] border-0 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)] animate-pulse" />
          LIVE
        </Badge>
        <a href="/itsm-executive-dashboard.json" download>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Grafana JSON
          </Button>
        </a>
        <a href="/itsm-alert-rules.json" download>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Alert Rules
          </Button>
        </a>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>

      </div>
    </header>
  );
}

function FilterBar(props: {
  range: string; setRange: (v: string) => void;
  service: string; setService: (v: string) => void;
  severity: string; setSeverity: (v: string) => void;
}) {
  const Item = ({ label, value, onChange, options }: any) => (
    <div className="flex flex-col gap-1">
      <span className="grafana-title">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[160px] text-xs bg-panel"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o: any) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  return (
    <div className="border-b border-border bg-[color:var(--color-panel)]/60 px-4 py-2 flex flex-wrap gap-3 items-end">
      <Item label="Date Range" value={props.range} onChange={props.setRange}
        options={[{v:"24h",l:"Last 24h"},{v:"7d",l:"Last 7 days"},{v:"30d",l:"Last 30 days"},{v:"90d",l:"Last quarter"},{v:"365d",l:"Last year"}]} />
      <Item label="Business Service" value={props.service} onChange={props.setService}
        options={[{v:"all",l:"All Services"},{v:"core",l:"Core Banking"},{v:"card",l:"Card Systems"},{v:"channels",l:"Channels"},{v:"treasury",l:"Treasury"}]} />
      <Item label="Priority" value={props.severity} onChange={props.setSeverity}
        options={[{v:"all",l:"All Priorities"},{v:"p1",l:"P1 - Critical"},{v:"p2",l:"P2 - High"},{v:"p3",l:"P3 - Medium"},{v:"p4",l:"P4 - Low"}]} />
      <Item label="Environment" value="prod" onChange={()=>{}}
        options={[{v:"prod",l:"Production"},{v:"uat",l:"UAT"},{v:"dr",l:"DR"},{v:"dev",l:"Development"}]} />
      <Item label="Change Type" value="all" onChange={()=>{}}
        options={[{v:"all",l:"All Types"},{v:"std",l:"Standard"},{v:"norm",l:"Normal"},{v:"emerg",l:"Emergency"}]} />
      <Item label="Assignment Group" value="all" onChange={()=>{}}
        options={[{v:"all",l:"All Groups"},{v:"core",l:"Core Banking Ops"},{v:"card",l:"Card Systems"},{v:"3p",l:"3rd Party"}]} />
    </div>
  );
}
