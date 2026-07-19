import { useMemo, useState } from "react";
import { Panel } from "./Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertTriangle, Mail, Send, MessageSquare, Users, Clock, CheckCircle2, Bell, Copy,
} from "lucide-react";
import { slaBySvc, incidentsByGroup, topRisks, assetLifecycle, highRiskChanges } from "@/lib/itsm-data";

type Severity = "Critical" | "High" | "Medium";
type Channel = "email" | "slack" | "teams";

interface Trigger {
  id: string;
  rule: string;
  severity: Severity;
  entity: string;
  detail: string;
  metric: string;
  threshold: string;
  owner: string;
}

const SEV_STYLE: Record<Severity, string> = {
  Critical: "bg-[color:var(--color-destructive)]/15 text-[color:var(--color-destructive)]",
  High: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
  Medium: "bg-[color:var(--color-info)]/15 text-[color:var(--color-info)]",
};

function evaluateRules(): Trigger[] {
  const out: Trigger[] = [];

  // Rule 1: SLA breach risk (SLA % < target, or atRisk > 2)
  slaBySvc.forEach((s, i) => {
    if (s.sla < s.target || s.atRisk >= 3) {
      out.push({
        id: `SLA-${i + 1}`,
        rule: "SLA Breach Risk",
        severity: s.sla < s.target - 4 ? "Critical" : "High",
        entity: s.service,
        detail: `SLA ${s.sla}% (target ${s.target}%) · ${s.atRisk} tickets at risk · ${s.breach} breaches (30d)`,
        metric: `${s.sla}%`,
        threshold: `≥ ${s.target}%`,
        owner: "Service Owner",
      });
    }
  });

  // Rule 2: Recurring incidents (recurring >= 6 in group)
  incidentsByGroup
    .filter((g) => g.recurring >= 6)
    .forEach((g, i) => {
      out.push({
        id: `REC-${i + 1}`,
        rule: "Recurring Incidents",
        severity: g.recurring >= 10 ? "High" : "Medium",
        entity: g.group,
        detail: `${g.recurring} recurring incidents in 30d · open ${g.open} · closed ${g.closed}`,
        metric: `${g.recurring}`,
        threshold: "≤ 5 / 30d",
        owner: g.group,
      });
    });

  // Rule 3: High-risk assets (top risks with score >= 70 + EOL/EOL-near assets)
  topRisks
    .filter((r) => r.score >= 70)
    .forEach((r) =>
      out.push({
        id: `RISK-${r.rank}`,
        rule: "High-Risk Asset / Service",
        severity: r.score >= 85 ? "Critical" : "High",
        entity: r.service,
        detail: `${r.risk} · risk score ${r.score}/100 · trend ${r.trend}`,
        metric: `${r.score}`,
        threshold: "< 70",
        owner: "Risk Owner",
      }),
    );

  const eol = assetLifecycle.find((a) => a.stage === "EOL");
  if (eol && eol.count > 500) {
    out.push({
      id: "RISK-EOL",
      rule: "High-Risk Asset / Service",
      severity: "High",
      entity: "CMDB · EOL Assets",
      detail: `${eol.count} assets past end-of-life · patching & vendor support unavailable`,
      metric: `${eol.count}`,
      threshold: "< 500",
      owner: "Asset Management",
    });
  }

  // High-risk changes in freeze window
  highRiskChanges
    .filter((c) => c.risk === "Critical" || (c.risk === "High" && c.cab === "Pending"))
    .forEach((c) =>
      out.push({
        id: c.id,
        rule: "High-Risk Change (CAB pending)",
        severity: c.risk === "Critical" ? "Critical" : "High",
        entity: c.title,
        detail: `${c.id} · owner ${c.owner} · window ${c.window} · CAB ${c.cab}`,
        metric: c.risk,
        threshold: "Approved",
        owner: c.owner,
      }),
    );

  return out.sort((a, b) => {
    const order: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2 };
    return order[a.severity] - order[b.severity];
  });
}

const DEFAULT_RECIPIENTS = {
  email: "aytaj.shikhiyeva@pashabank.az",
  slack: "#itsm-exec-alerts",
  teams: "ITSM Operations › Executive Alerts",
};

export function AlertingSection() {
  const triggers = useMemo(() => evaluateRules(), []);
  const [channels, setChannels] = useState<Record<Channel, boolean>>({
    email: true,
    slack: true,
    teams: true,
  });
  const [recipients, setRecipients] = useState(DEFAULT_RECIPIENTS);
  const [schedule] = useState("Daily digest · 08:00 Asia/Baku");

  const counts = {
    Critical: triggers.filter((t) => t.severity === "Critical").length,
    High: triggers.filter((t) => t.severity === "High").length,
    Medium: triggers.filter((t) => t.severity === "Medium").length,
  };

  const nextRun = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (d.getHours() >= 8 ? 1 : 0));
    d.setHours(8, 0, 0, 0);
    return d.toLocaleString();
  })();

  const emailBody = buildEmail(triggers);
  const slackBody = buildSlack(triggers);
  const teamsBody = buildTeams(triggers);

  const sendTest = (ch: Channel) => {
    const target = recipients[ch];
    toast.success(`Simulated ${ch.toUpperCase()} digest sent`, {
      description: `${triggers.length} triggered alerts → ${target}`,
    });
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Alerting & Notifications</h2>
        <span className="text-xs text-muted-foreground">
          Rule-based digest · in-dashboard simulation · no live sends
        </span>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Triggered Alerts" value={triggers.length} tone="warning" />
        <SummaryCard icon={<Bell className="h-4 w-4" />} label="Critical / High / Medium" value={`${counts.Critical} / ${counts.High} / ${counts.Medium}`} />
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Schedule" value={schedule} small />
        <SummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="Next Digest" value={nextRun} small tone="success" />
      </div>

      {/* Channel config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChannelCard
          icon={<Mail className="h-4 w-4" />}
          title="Email"
          enabled={channels.email}
          onToggle={(v) => setChannels((c) => ({ ...c, email: v }))}
          value={recipients.email}
          onChange={(v) => setRecipients((r) => ({ ...r, email: v }))}
          placeholder="alerts@bank.com"
          onTest={() => sendTest("email")}
        />
        <ChannelCard
          icon={<MessageSquare className="h-4 w-4" />}
          title="Slack"
          enabled={channels.slack}
          onToggle={(v) => setChannels((c) => ({ ...c, slack: v }))}
          value={recipients.slack}
          onChange={(v) => setRecipients((r) => ({ ...r, slack: v }))}
          placeholder="#channel"
          onTest={() => sendTest("slack")}
        />
        <ChannelCard
          icon={<Users className="h-4 w-4" />}
          title="Microsoft Teams"
          enabled={channels.teams}
          onToggle={(v) => setChannels((c) => ({ ...c, teams: v }))}
          value={recipients.teams}
          onChange={(v) => setRecipients((r) => ({ ...r, teams: v }))}
          placeholder="Team › Channel"
          onTest={() => sendTest("teams")}
        />
      </div>

      {/* Rules table */}
      <Panel title={`Triggered alerts (${triggers.length}) · evaluated against active rules`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left border-b border-border">
                <th className="py-2 pr-3">Severity</th>
                <th className="py-2 pr-3">Rule</th>
                <th className="py-2 pr-3">Entity</th>
                <th className="py-2 pr-3">Detail</th>
                <th className="py-2 pr-3">Metric</th>
                <th className="py-2 pr-3">Threshold</th>
                <th className="py-2 pr-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="py-2 pr-3">
                    <Badge className={`${SEV_STYLE[t.severity]} border-0`}>{t.severity}</Badge>
                  </td>
                  <td className="py-2 pr-3 font-medium">{t.rule}</td>
                  <td className="py-2 pr-3">{t.entity}</td>
                  <td className="py-2 pr-3 text-muted-foreground max-w-[380px]">{t.detail}</td>
                  <td className="py-2 pr-3 tabular-nums">{t.metric}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{t.threshold}</td>
                  <td className="py-2 pr-3">{t.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Message previews */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <PreviewPanel
          title="Email preview"
          subtitle={recipients.email}
          enabled={channels.email}
          body={emailBody}
          onCopy={() => copy(emailBody)}
          onSend={() => sendTest("email")}
        />
        <PreviewPanel
          title="Slack preview"
          subtitle={recipients.slack}
          enabled={channels.slack}
          body={slackBody}
          onCopy={() => copy(slackBody)}
          onSend={() => sendTest("slack")}
        />
        <PreviewPanel
          title="Teams preview"
          subtitle={recipients.teams}
          enabled={channels.teams}
          body={teamsBody}
          onCopy={() => copy(teamsBody)}
          onSend={() => sendTest("teams")}
        />
      </div>

      <Panel title="Active alert rules">
        <ul className="text-xs space-y-2 text-muted-foreground">
          <li><b className="text-foreground">SLA Breach Risk</b> — trigger when service SLA % &lt; target OR ≥ 3 tickets at risk. Severity Critical if SLA is 4pt below target.</li>
          <li><b className="text-foreground">Recurring Incidents</b> — trigger when an assignment group has ≥ 6 recurring incidents in 30 days. High severity at ≥ 10.</li>
          <li><b className="text-foreground">High-Risk Asset / Service</b> — trigger for top-risk register entries with score ≥ 70 and for EOL asset counts &gt; 500.</li>
          <li><b className="text-foreground">High-Risk Change (CAB pending)</b> — trigger for Critical changes or High changes without CAB approval before the change window.</li>
        </ul>
      </Panel>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function SummaryCard({
  icon, label, value, tone, small,
}: { icon: React.ReactNode; label: string; value: string | number; tone?: "success" | "warning"; small?: boolean }) {
  const color =
    tone === "success" ? "text-[color:var(--color-success)]"
    : tone === "warning" ? "text-[color:var(--color-warning)]"
    : "text-foreground";
  return (
    <div className="panel p-3 flex flex-col gap-1 min-h-[92px]">
      <div className="grafana-title flex items-center gap-1.5">{icon}{label}</div>
      <div className={`${small ? "text-sm" : "text-2xl"} font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ChannelCard({
  icon, title, enabled, onToggle, value, onChange, placeholder, onTest,
}: {
  icon: React.ReactNode; title: string; enabled: boolean; onToggle: (v: boolean) => void;
  value: string; onChange: (v: string) => void; placeholder: string; onTest: () => void;
}) {
  return (
    <Panel
      title={title}
      actions={
        <button
          onClick={() => onToggle(!enabled)}
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            enabled
              ? "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)] border-[color:var(--color-success)]/30"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          {enabled ? "ENABLED" : "DISABLED"}
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>Recipient</span>
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs bg-panel"
        />
        <Button size="sm" variant="outline" className="h-8 gap-1.5 self-start" onClick={onTest} disabled={!enabled}>
          <Send className="h-3.5 w-3.5" /> Send test digest
        </Button>
      </div>
    </Panel>
  );
}

function PreviewPanel({
  title, subtitle, enabled, body, onCopy, onSend,
}: { title: string; subtitle: string; enabled: boolean; body: string; onCopy: () => void; onSend: () => void }) {
  return (
    <Panel
      title={title}
      actions={
        <div className="flex items-center gap-1">
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground p-1" title="Copy">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onSend}
            disabled={!enabled}
            className="text-[10px] px-2 py-0.5 rounded bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)] disabled:opacity-40"
          >
            SEND TEST
          </button>
        </div>
      }
    >
      <div className="text-[11px] text-muted-foreground mb-2">to: {subtitle}</div>
      <pre className="text-[11px] leading-relaxed whitespace-pre-wrap bg-[color:var(--color-panel)]/60 border border-border rounded p-2 max-h-[380px] overflow-auto font-mono">
{body}
      </pre>
    </Panel>
  );
}

/* ---------------- message builders ---------------- */

function group(triggers: Trigger[], rule: string) {
  return triggers.filter((t) => t.rule === rule);
}

function buildEmail(triggers: Trigger[]) {
  const date = new Date().toLocaleDateString();
  const sec = (label: string, list: Trigger[]) =>
    list.length === 0
      ? ""
      : `\n${label} (${list.length})\n${"─".repeat(48)}\n` +
        list.map((t) => `• [${t.severity}] ${t.entity}\n    ${t.detail}\n    Owner: ${t.owner}`).join("\n");

  return (
`Subject: [ITSM] Daily Executive Alert Digest · ${date}

Enterprise Banking · ITSM Executive Dashboard
Digest window: last 24h  ·  Generated: ${new Date().toLocaleString()}

Summary
────────────────────────────────
Triggered alerts : ${triggers.length}
Critical         : ${triggers.filter((t) => t.severity === "Critical").length}
High             : ${triggers.filter((t) => t.severity === "High").length}
Medium           : ${triggers.filter((t) => t.severity === "Medium").length}
` +
    sec("SLA Breach Risk", group(triggers, "SLA Breach Risk")) +
    sec("Recurring Incidents", group(triggers, "Recurring Incidents")) +
    sec("High-Risk Assets / Services", group(triggers, "High-Risk Asset / Service")) +
    sec("High-Risk Changes (CAB pending)", group(triggers, "High-Risk Change (CAB pending)")) +
    `\n\nOpen dashboard → https://itsm.pashabank.az/exec\n— ITSM Automation`
  );
}

function buildSlack(triggers: Trigger[]) {
  const emoji: Record<Severity, string> = { Critical: ":rotating_light:", High: ":warning:", Medium: ":large_blue_circle:" };
  const top = triggers.slice(0, 10);
  return (
`*:bar_chart: ITSM Executive Digest* — ${new Date().toLocaleDateString()}
> ${triggers.length} triggered alerts · Critical ${triggers.filter((t)=>t.severity==="Critical").length} · High ${triggers.filter((t)=>t.severity==="High").length}

` +
    top.map((t) => `${emoji[t.severity]} *${t.rule}* — \`${t.entity}\`\n     ${t.detail}\n     _Owner:_ ${t.owner}`).join("\n") +
    (triggers.length > top.length ? `\n\n_+ ${triggers.length - top.length} more in the dashboard_` : "") +
    `\n\n<https://itsm.pashabank.az/exec|Open dashboard>`
  );
}

function buildTeams(triggers: Trigger[]) {
  const top = triggers.slice(0, 10);
  return (
`ITSM Executive Digest — ${new Date().toLocaleDateString()}

**${triggers.length} triggered alerts**
- Critical: ${triggers.filter((t)=>t.severity==="Critical").length}
- High: ${triggers.filter((t)=>t.severity==="High").length}
- Medium: ${triggers.filter((t)=>t.severity==="Medium").length}

---

` +
    top.map((t) => `**[${t.severity}] ${t.rule}**  \n${t.entity} — ${t.detail}  \n_Owner: ${t.owner}_`).join("\n\n") +
    (triggers.length > top.length ? `\n\n_+ ${triggers.length - top.length} more in the dashboard_` : "") +
    `\n\n[Open dashboard](https://itsm.pashabank.az/exec)`
  );
}
