import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBar, RadialBarChart, PolarAngleAxis,
} from "recharts";
import type { ReactNode } from "react";

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: { stroke: "var(--color-border)" },
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 6,
    fontSize: 12,
    color: "var(--color-popover-foreground)",
  },
  labelStyle: { color: "var(--color-muted-foreground)" },
  cursor: { fill: "var(--color-accent)", opacity: 0.25 },
};

export function Sparkline({ data, dataKey = "value", color = "var(--color-chart-1)", height = 40 }: {
  data: any[]; dataKey?: string; color?: string; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TimeSeries({ data, series, height = 220, stacked = false }: {
  data: any[];
  series: { key: string; color: string; name?: string }[];
  height?: number;
  stacked?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={Object.keys(data[0] ?? { date: "" })[0]} {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip {...tooltipStyle} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name ?? s.key}
            stroke={s.color}
            strokeWidth={1.6}
            fill={`url(#g-${s.key})`}
            stackId={stacked ? "1" : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, xKey, series, height = 220, layout = "horizontal" }: {
  data: any[];
  xKey: string;
  series: { key: string; color: string; name?: string; stackId?: string }[];
  height?: number;
  layout?: "horizontal" | "vertical";
}) {
  const vert = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, bottom: 0, left: vert ? 40 : -10 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={!vert} vertical={vert} />
        {vert ? (
          <>
            <XAxis type="number" {...axisProps} />
            <YAxis type="category" dataKey={xKey} {...axisProps} width={130} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axisProps} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis {...axisProps} width={40} />
          </>
        )}
        <Tooltip {...tooltipStyle} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name ?? s.key} fill={s.color} stackId={s.stackId} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 220, innerRadius = 55, outerRadius = 80 }: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2} stroke="var(--color-panel)">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Gauge({ value, max = 100, label, color = "var(--color-chart-1)", height = 160 }: {
  value: number; max?: number; label?: string; color?: string; height?: number;
}) {
  const data = [{ name: "v", value, fill: color }];
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
          <RadialBar background={{ fill: "var(--color-accent)" }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-semibold tabular-nums" style={{ color }}>{value}</div>
        {label && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}

export function Line1({ data, color = "var(--color-chart-1)", height = 60, yDomain }: {
  data: { month: string; value: number }[]; color?: string; height?: number; yDomain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <YAxis hide domain={yDomain ?? ["auto", "auto"]} />
        <Tooltip {...tooltipStyle} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.8} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ChartWrap({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return <div style={{ height }}>{children}</div>;
}
