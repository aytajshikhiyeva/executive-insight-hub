// Metric definitions: label, meaning, and PostgreSQL script.
// Used by the in-app "Executive Report" and metric info tooltips.
export type MetricDef = {
  id: string;
  label: string;
  meaning: string;
  sql: string;
  target?: string;
};

export const METRICS: MetricDef[] = [
  {
    id: "total_incidents",
    label: "Total Incidents (30d)",
    meaning: "Count of all incident tickets created in the last 30 days. Baseline volume KPI.",
    target: "Watch trend, not absolute",
    sql: "SELECT COUNT(*) FROM incidents WHERE created_at >= NOW() - INTERVAL '30 days' AND env = 'prod';",
  },
  {
    id: "open_incidents",
    label: "Open Incidents",
    meaning: "Incidents not yet resolved or closed. Rising backlog = reduced throughput.",
    sql: "SELECT COUNT(*) FROM incidents WHERE status NOT IN ('resolved','closed') AND env='prod';",
  },
  {
    id: "major_incidents",
    label: "Major Incidents (P1)",
    meaning: "P1 incidents in period. Any non-zero value must be reviewed at CAB.",
    target: "0 concurrent P1",
    sql: "SELECT COUNT(*) FROM incidents WHERE priority='P1' AND created_at >= NOW() - INTERVAL '30 days';",
  },
  {
    id: "sla_compliance",
    label: "SLA Compliance %",
    meaning: "Share of incidents resolved within SLA. Core availability KPI.",
    target: ">= 95%",
    sql: "SELECT 100.0 * SUM(CASE WHEN sla_breached=false THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) FROM incidents WHERE created_at >= NOW() - INTERVAL '30 days';",
  },
  {
    id: "health_score",
    label: "Service Health Score",
    meaning: "Composite index (0-100) of availability, SLA and incident load.",
    target: ">= 85",
    sql: "SELECT AVG(health_score) FROM service_health WHERE ts >= NOW() - INTERVAL '1 hour';",
  },
  {
    id: "risk_score",
    label: "Operational Risk Score",
    meaning: "Composite operational risk (0-100). Lower is better.",
    target: "< 40",
    sql: "SELECT AVG(score) FROM risk_scores WHERE ts >= NOW() - INTERVAL '1 day';",
  },
  {
    id: "change_success",
    label: "Successful Change Rate",
    meaning: "% of changes closed as successful. ITIL v4 change-enablement KPI.",
    target: ">= 95%",
    sql: "SELECT 100.0 * SUM(CASE WHEN status='successful' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) FROM changes WHERE actual_end >= NOW() - INTERVAL '30 days';",
  },
  {
    id: "change_failure",
    label: "Change Failure Rate",
    meaning: "% of changes rolled back or that caused an incident within 24h.",
    target: "< 5%",
    sql: "SELECT 100.0 * SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) FROM changes WHERE actual_end >= NOW() - INTERVAL '30 days';",
  },
  {
    id: "emergency_change",
    label: "Emergency Change Rate",
    meaning: "Emergency changes as % of total changes. Signals CAB bypass.",
    target: "< 5%",
    sql: "SELECT 100.0 * SUM(CASE WHEN change_type='emergency' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) FROM changes WHERE created_at >= NOW() - INTERVAL '30 days';",
  },
  {
    id: "cab_approval",
    label: "CAB Approval Rate",
    meaning: "Share of changes approved by CAB. Low rate = poor change quality.",
    sql: "SELECT 100.0 * SUM(CASE WHEN cab_status='approved' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) FROM changes WHERE created_at >= NOW() - INTERVAL '30 days';",
  },
  {
    id: "repeated_internal",
    label: "Repeated Incidents (Internal)",
    meaning: "Recurring incidents from internal systems. Root causes unresolved.",
    target: "< 5%",
    sql: "SELECT 100.0 * SUM(CASE WHEN is_recurring AND source='internal' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) FROM incidents WHERE created_at >= NOW() - INTERVAL '30 days';",
  },
  {
    id: "repeated_third",
    label: "Repeated Incidents (3rd Party)",
    meaning: "Recurring incidents from third-party services. Vendor governance signal.",
    sql: "SELECT 100.0 * SUM(CASE WHEN is_recurring AND source='third_party' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) FROM incidents WHERE created_at >= NOW() - INTERVAL '30 days';",
  },
  {
    id: "mttd",
    label: "MTTD (Mean Time To Detect)",
    meaning: "Time between event occurrence and detection. Split auto (monitoring) vs manual (user report).",
    target: "Auto < 5 min, Manual < 15 min",
    sql: "SELECT detection_type, AVG(EXTRACT(EPOCH FROM (detected_at - created_at))/60.0) AS minutes FROM incidents WHERE detected_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days' GROUP BY 1;",
  },
  {
    id: "mtta",
    label: "MTTA (Mean Time To Acknowledge)",
    meaning: "Time between detection and on-call acknowledgement, split by working / non-working hours.",
    target: "WH < 10m, NH < 15m",
    sql: "SELECT hours_bucket, AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60.0) AS minutes FROM incidents WHERE first_response_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days' GROUP BY 1;",
  },
  {
    id: "mttr",
    label: "MTTR (Mean Time To Resolve)",
    meaning: "Total time from ticket creation to resolution, split WH vs NH.",
    target: "WH < 2h, NH < 4h",
    sql: "SELECT hours_bucket, AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600.0) AS hours FROM incidents WHERE resolved_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days' GROUP BY 1;",
  },
  {
    id: "cmdb_coverage",
    label: "CMDB Coverage %",
    meaning: "Share of CIs with valid owner AND lifecycle stage.",
    target: ">= 95%",
    sql: "SELECT 100.0 * SUM(CASE WHEN team IS NOT NULL AND lifecycle_stage IS NOT NULL THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) FROM assets;",
  },
  {
    id: "eol_assets",
    label: "EOL Assets (60d)",
    meaning: "Assets reaching end-of-life within 60 days. Refresh / extended-support required.",
    sql: "SELECT COUNT(*) FROM assets WHERE eol_date BETWEEN NOW() AND NOW() + INTERVAL '60 days';",
  },
  {
    id: "critical_assets",
    label: "Critical Assets",
    meaning: "CIs tagged as business-critical (Tier-1).",
    sql: "SELECT COUNT(*) FROM assets WHERE criticality='critical' AND env='prod';",
  },
  {
    id: "top_risks",
    label: "Top Operational Risks",
    meaning: "Highest-scored open risks in the risk register. Feeds Executive Risk Committee.",
    sql: "SELECT risk_title, service, score FROM risk_register WHERE status='open' ORDER BY score DESC LIMIT 10;",
  },
  {
    id: "high_risk_changes",
    label: "Upcoming High-Risk Changes",
    meaning: "Planned changes with risk High/Critical in next 7 days.",
    sql: "SELECT change_id, title, risk, cab_status, planned_start, owner FROM changes WHERE risk IN ('High','Critical') AND planned_start BETWEEN NOW() AND NOW() + INTERVAL '7 days' ORDER BY planned_start;",
  },
];

export const metricById = Object.fromEntries(METRICS.map((m) => [m.id, m]));
