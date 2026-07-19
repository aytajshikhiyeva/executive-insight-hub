// Realistic dummy enterprise banking ITSM data
export const SERVICES = [
  "Core Banking - Accounts",
  "Core Banking - Payments",
  "Core Banking - Ledger",
  "Card Authorization Switch",
  "Card Issuance Platform",
  "ATM Network",
  "Internet Banking",
  "Mobile Banking",
  "SWIFT Gateway",
  "Fraud Detection",
  "Loan Origination",
  "Treasury System",
] as const;

export const ASSIGNMENT_GROUPS = [
  "Core Banking Ops",
  "Card Systems Team",
  "Network & Security",
  "Database Admins",
  "Cloud Infra",
  "Middleware",
  "3rd Party - Vendor A",
  "3rd Party - Vendor B",
  "Application Support",
];

export const kpis = {
  totalIncidents: 4287,
  openIncidents: 312,
  closedIncidents: 3975,
  majorIncidents: 14,
  totalChanges: 1246,
  successfulChanges: 1128,
  failedChanges: 68,
  emergencyChanges: 50,
  activeAssets: 18642,
  criticalAssets: 2416,
  cmdbCoverage: 94.2,
  slaCompliance: 96.4,
  healthScore: 87,
  riskScore: 42,
};

export const incidentTrend = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const base = 140 + Math.sin(i / 3) * 22 + (i > 20 ? 18 : 0);
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    P1: Math.max(0, Math.round(2 + Math.sin(i / 4) * 2 + (i > 22 ? 2 : 0))),
    P2: Math.round(base * 0.15 + Math.random() * 3),
    P3: Math.round(base * 0.45 + Math.random() * 6),
    P4: Math.round(base * 0.35 + Math.random() * 4),
    resolved: Math.round(base * 0.9 + Math.random() * 5),
  };
});

export const severity = [
  { name: "P1 - Critical", value: 34, color: "var(--color-destructive)" },
  { name: "P2 - High", value: 187, color: "var(--color-warning)" },
  { name: "P3 - Medium", value: 1826, color: "var(--color-info)" },
  { name: "P4 - Low", value: 2240, color: "var(--color-success)" },
];

export const slaBySvc = SERVICES.slice(0, 8).map((s, i) => ({
  service: s.replace("Core Banking - ", "CB "),
  sla: +(88 + Math.random() * 11).toFixed(1),
  breach: Math.round(Math.random() * 6),
  target: 95,
  atRisk: i % 3 === 0 ? Math.round(2 + Math.random() * 4) : Math.round(Math.random() * 2),
}));

export const incidentsByGroup = ASSIGNMENT_GROUPS.map((g) => ({
  group: g,
  open: Math.round(8 + Math.random() * 42),
  closed: Math.round(120 + Math.random() * 260),
  recurring: Math.round(Math.random() * 12),
}));

export const incidentsByService = SERVICES.map((s) => ({
  service: s,
  count: Math.round(80 + Math.random() * 420),
  major: Math.round(Math.random() * 4),
}));

export const aging = [
  { bucket: "< 1d", count: 128, color: "var(--color-success)" },
  { bucket: "1-3d", count: 92, color: "var(--color-info)" },
  { bucket: "3-7d", count: 54, color: "var(--color-warning)" },
  { bucket: "7-14d", count: 26, color: "var(--color-warning)" },
  { bucket: "> 14d", count: 12, color: "var(--color-destructive)" },
];

export const changeTrend = Array.from({ length: 12 }, (_, i) => {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i];
  const success = 80 + Math.round(Math.sin(i / 2) * 12 + Math.random() * 6);
  const failed = Math.round(2 + Math.random() * 6 + (i === 8 ? 4 : 0));
  const emergency = Math.round(2 + Math.random() * 5);
  return { month: m, success, failed, emergency };
});

export const cabStatus = [
  { name: "Approved", value: 168, color: "var(--color-success)" },
  { name: "Pending", value: 24, color: "var(--color-warning)" },
  { name: "Rejected", value: 12, color: "var(--color-destructive)" },
  { name: "Deferred", value: 8, color: "var(--color-info)" },
];

export const highRiskChanges = [
  { id: "CHG-40218", title: "Core Banking DB failover drill", risk: "High", cab: "Approved", window: "Sat 02:00", owner: "DB Admins" },
  { id: "CHG-40231", title: "Card Switch firmware upgrade", risk: "High", cab: "Approved", window: "Sun 01:30", owner: "Card Team" },
  { id: "CHG-40244", title: "SWIFT MQ cluster patch", risk: "Critical", cab: "Pending", window: "Sat 03:00", owner: "Middleware" },
  { id: "CHG-40251", title: "Fraud engine ML model rollout", risk: "High", cab: "Approved", window: "Fri 22:00", owner: "App Support" },
  { id: "CHG-40260", title: "ATM network router refresh", risk: "Medium", cab: "Approved", window: "Sun 04:00", owner: "Network" },
];

export const assetLifecycle = [
  { stage: "Plan", count: 420, color: "var(--color-info)" },
  { stage: "Deploy", count: 1240, color: "var(--color-chart-5)" },
  { stage: "Operate", count: 14320, color: "var(--color-success)" },
  { stage: "Retire", count: 1826, color: "var(--color-warning)" },
  { stage: "EOL", count: 836, color: "var(--color-destructive)" },
];

export const assetOwnership = [
  { team: "Core Banking", assets: 5240 },
  { team: "Card Systems", assets: 3120 },
  { team: "Channels", assets: 2860 },
  { team: "Infra & Cloud", assets: 4520 },
  { team: "Security", assets: 1420 },
  { team: "Corporate IT", assets: 1482 },
];

// Heatmap: risk score by service x category
export const riskHeatmap = SERVICES.slice(0, 10).map((s) => ({
  service: s,
  cells: ["Availability", "Change", "Security", "Capacity", "SLA", "Vendor"].map((c) => ({
    cat: c,
    value: Math.round(10 + Math.random() * 90),
  })),
}));

export const topRisks = [
  { rank: 1, risk: "SWIFT MQ single point of failure", service: "SWIFT Gateway", score: 92, trend: "up" },
  { rank: 2, risk: "Card Auth Switch capacity < 20% headroom", service: "Card Authorization Switch", score: 88, trend: "up" },
  { rank: 3, risk: "Core Banking DB nearing EOL support", service: "Core Banking - Ledger", score: 85, trend: "flat" },
  { rank: 4, risk: "Recurring incident cluster: Mobile Banking login", service: "Mobile Banking", score: 79, trend: "up" },
  { rank: 5, risk: "Emergency changes exceeding threshold", service: "Card Issuance Platform", score: 74, trend: "up" },
  { rank: 6, risk: "ATM firmware unpatched (17 sites)", service: "ATM Network", score: 71, trend: "down" },
  { rank: 7, risk: "Fraud model drift on high-value txns", service: "Fraud Detection", score: 68, trend: "up" },
  { rank: 8, risk: "Internet Banking cert expiry (28d)", service: "Internet Banking", score: 64, trend: "flat" },
  { rank: 9, risk: "CMDB freshness < 90% for network CIs", service: "Network CIs", score: 58, trend: "down" },
  { rank: 10, risk: "Vendor B SLA breach pattern", service: "Loan Origination", score: 54, trend: "flat" },
];

// Section 2 IT Performance Management
export const perf = {
  changeSuccess: { pct: 90.5, count: 1128, trend: +1.2 },
  changeFailed: { pct: 5.5, count: 68, trend: -0.8 },
  repeatedInternal: { pct: 7.2, count: 214, trend: -0.6 },
  repeatedThirdParty: { pct: 4.1, count: 122, trend: +0.9 },
  emergency: { pct: 4.0, count: 50, monthly: +6.2, quarterly: +11.4 },
  mttdAuto: { avgMin: 3.2, trend: -0.4, target: 5, actual: 3.2 },
  mttdManual: { avgMin: 18.6, trend: +1.1, target: 15, actual: 18.6 },
  mttaWH: { avgMin: 6.4, trend: -0.5, target: 10 },
  mttaNH: { avgMin: 14.7, trend: +0.8, target: 15 },
  mttrWH: { avgHr: 1.6, trend: -0.2, target: 2 },
  mttrNH: { avgHr: 3.4, trend: +0.3, target: 4 },
};

function trendSeries(base: number, points = 12, jitter = 0.15) {
  return Array.from({ length: points }, (_, i) => {
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i];
    return { month: m, value: +(base + Math.sin(i / 2) * base * jitter + (Math.random() - 0.5) * base * 0.08).toFixed(2) };
  });
}

export const coreBankingTrends = {
  incident: trendSeries(140), change: trendSeries(90), availability: trendSeries(99.85, 12, 0.001),
  mttd: trendSeries(4), mtta: trendSeries(8), mttr: trendSeries(2.1),
  failed: trendSeries(5), emergency: trendSeries(4), sla: trendSeries(96, 12, 0.02),
};
export const cardSystemsTrends = {
  incident: trendSeries(95), change: trendSeries(60), availability: trendSeries(99.72, 12, 0.002),
  mttd: trendSeries(5), mtta: trendSeries(9), mttr: trendSeries(2.6),
  failed: trendSeries(6), emergency: trendSeries(5), sla: trendSeries(94, 12, 0.03),
};

export const insights = [
  { type: "warning", title: "MTTD (manual) trending up", body: "Manual detection MTTD increased 6% MoM, driven by Channels team after-hours coverage gap. Recommend expanding PRTG coverage to Mobile Banking edge nodes." },
  { type: "success", title: "MTTR improved on Core Banking", body: "MTTR down 12% QoQ following runbook automation for ledger reconciliation jobs." },
  { type: "danger", title: "Card Issuance: excessive emergency changes", body: "8 emergency changes in last 30 days (target ≤ 3). Investigate change quality and CAB bypass patterns." },
  { type: "warning", title: "SLA breach risk – SWIFT Gateway", body: "3 P2 incidents open > 6h; projected SLA breach within 4h. Escalate to Middleware on-call." },
  { type: "info", title: "Recurring incidents – Mobile Banking login", body: "14 recurring incidents in 30d. Root cause pending – open PRB-2214 with App Support." },
  { type: "danger", title: "High operational risk – SWIFT MQ SPOF", body: "Single MQ node with no active/active. Prioritize CHG-40244 at next CAB." },
];

export const actions = [
  "Approve CHG-40244 (SWIFT MQ HA) at next CAB",
  "Add capacity to Card Auth Switch – target 40% headroom by Q+1",
  "Open PRB for Mobile Banking login recurring incidents",
  "Retire 836 EOL assets in next 60 days",
  "Refresh CMDB ownership for 412 orphaned CIs",
  "Enforce change freeze for Card Issuance until failure rate < 3%",
  "Renew Internet Banking TLS cert (28d to expiry)",
  "Expand PRTG auto-detection to Channels edge nodes",
  "Review Vendor B SLA credits and escalation matrix",
  "Prioritize DR test for Core Banking Ledger before Q-end",
];

export const improvements = [
  "Automate ledger reconciliation runbooks (est. -20% MTTR)",
  "Introduce error budgets for Tier-1 services",
  "Adopt progressive delivery for Card Issuance releases",
  "Consolidate 3rd party alert channels into a single AIOps pipeline",
  "Deploy synthetic monitoring for Mobile Banking critical journeys",
  "Standardize CAB templates with risk scoring",
  "Implement CMDB auto-discovery weekly for network CIs",
  "Chaos game-day quarterly for SWIFT & Card Switch",
  "Enforce change slot policy for weekends only for Tier-1",
  "Introduce SRE rotation for Channels domain",
];
