import type { Quadrant } from "@/lib/types";

// 象限ごとの配色（色だけに依存しないようラベル＋記号も併用：ガイド Do #10）
export const QUADRANT_STYLE: Record<
  Quadrant,
  { label: string; mark: string; text: string; bg: string; border: string; chart: string }
> = {
  理想型: {
    label: "理想型",
    mark: "◎",
    text: "text-ok-900",
    bg: "bg-ok-50",
    border: "border-ok-400",
    chart: "#259D63",
  },
  効率型: {
    label: "効率型",
    mark: "○",
    text: "text-blue-900",
    bg: "bg-blue-50",
    border: "border-blue-400",
    chart: "#3460FB",
  },
  改善必要: {
    label: "改善必要",
    mark: "△",
    text: "text-warn-900",
    bg: "bg-warn-50",
    border: "border-warn-400",
    chart: "#FB5B01",
  },
  活動不足: {
    label: "活動不足",
    mark: "✕",
    text: "text-danger-900",
    bg: "bg-danger-50",
    border: "border-danger-400",
    chart: "#FE3939",
  },
};

export function QuadrantBadge({ q }: { q: Quadrant }) {
  const s = QUADRANT_STYLE[q];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text} ${s.border}`}
    >
      <span aria-hidden>{s.mark}</span>
      {s.label}
    </span>
  );
}

export function SeverityDot({
  severity,
}: {
  severity: "good" | "watch" | "alert";
}) {
  const map = {
    good: { c: "bg-ok-600", t: "良好" },
    watch: { c: "bg-warn-400", t: "注視" },
    alert: { c: "bg-danger-600", t: "要対応" },
  } as const;
  const m = map[severity];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700">
      <span className={`h-2.5 w-2.5 rounded-full ${m.c}`} aria-hidden />
      {m.t}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: React.ReactNode;
  tone?: "default" | "primary";
}) {
  return (
    <div
      className={`card flex flex-col justify-between ${
        tone === "primary" ? "bg-blue-900 text-white border-blue-900" : ""
      }`}
    >
      <div
        className={`text-xs font-medium ${
          tone === "primary" ? "text-blue-50" : "text-label"
        }`}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums tracking-tight">
          {value}
        </span>
        {unit && (
          <span
            className={`text-sm font-medium ${
              tone === "primary" ? "text-blue-50" : "text-label"
            }`}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-xs">{sub}</div>}
    </div>
  );
}

export function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  const cls = positive ? "text-ok-600" : "text-danger-600";
  const arrow = positive ? "▲" : "▼";
  return (
    <span className={`font-semibold tabular-nums ${cls}`}>
      {arrow} {Math.abs(value).toFixed(0)}%
      <span className="ml-1 font-normal text-label">前週比</span>
    </span>
  );
}
