import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Info, Minus } from "lucide-react";

function InfoDot({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground cursor-help shrink-0"
    >
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  padded = true,
  info,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  info?: string;
}) {
  return (
    <div className={cn("panel flex flex-col", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="grafana-title truncate">{title}</h3>
            {info && <InfoDot text={info} />}
          </div>
          {actions}
        </div>
      )}
      <div className={cn("flex-1 min-w-0", padded && "p-3")}>{children}</div>
    </div>
  );
}

type StatTone = "success" | "warning" | "danger" | "info" | "neutral";
const toneClass: Record<StatTone, string> = {
  success: "text-[color:var(--color-success)]",
  warning: "text-[color:var(--color-warning)]",
  danger: "text-[color:var(--color-destructive)]",
  info: "text-[color:var(--color-info)]",
  neutral: "text-foreground",
};

export function Stat({
  label,
  value,
  suffix,
  sub,
  tone = "neutral",
  trend,
  className,
  info,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  sub?: string;
  tone?: StatTone;
  trend?: number;
  className?: string;
  info?: string;
}) {
  return (
    <div className={cn("panel p-3 flex flex-col gap-1 min-h-[92px]", className)}>
      <div className="flex items-center justify-between gap-1">
        <div className="grafana-title truncate">{label}</div>
        {info && <InfoDot text={info} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-semibold tabular-nums", toneClass[tone])}>{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {typeof trend === "number" && <TrendPill value={trend} />}
        {sub && <span className="truncate">{sub}</span>}
      </div>
    </div>
  );
}

export function TrendPill({ value, unit = "%" }: { value: number; unit?: string }) {
  const up = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;
  const color = flat
    ? "text-muted-foreground"
    : up
    ? "text-[color:var(--color-warning)]"
    : "text-[color:var(--color-success)]";
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", color)}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}
      {unit}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}
