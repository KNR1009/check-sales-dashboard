"use client";

import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Label,
} from "recharts";
import type { RepSummary } from "@/lib/types";
import { QUADRANT_STYLE } from "@/components/ui";
import { toManYen, yen, num } from "@/lib/format";

interface Props {
  summaries: RepSummary[];
  onSelect?: (repId: string) => void;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function ActivityResultScatter({ summaries, onSelect }: Props) {
  const data = summaries.map((s) => ({
    x: s.totalActivity,
    y: toManYen(s.grossProfit),
    name: s.rep.name,
    repId: s.rep.id,
    quadrant: s.quadrant,
    contracts: s.contractCount,
  }));

  const actMed = median(summaries.map((s) => s.totalActivity));
  const resMed = toManYen(median(summaries.map((s) => s.grossProfit)));

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 36, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
        <XAxis
          type="number"
          dataKey="x"
          name="行動量"
          tick={{ fontSize: 12, fill: "#626264" }}
          stroke="#CCCCCC"
        >
          <Label
            value="行動量（件・期間合計）→"
            position="bottom"
            offset={16}
            style={{ fontSize: 12, fill: "#626264" }}
          />
        </XAxis>
        <YAxis
          type="number"
          dataKey="y"
          name="粗利"
          tick={{ fontSize: 12, fill: "#626264" }}
          stroke="#CCCCCC"
        >
          <Label
            value="↑ 成果（決済粗利・万円）"
            angle={-90}
            position="insideLeft"
            offset={-4}
            style={{ fontSize: 12, fill: "#626264", textAnchor: "middle" }}
          />
        </YAxis>
        <ZAxis range={[140, 140]} />
        <ReferenceLine x={actMed} stroke="#999999" strokeDasharray="4 4">
          <Label value="行動量 中央値" position="top" style={{ fontSize: 10, fill: "#999999" }} />
        </ReferenceLine>
        <ReferenceLine y={resMed} stroke="#999999" strokeDasharray="4 4" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null;
            const d = payload[0].payload as (typeof data)[number];
            return (
              <div className="rounded-lg border border-ink-200 bg-white p-3 text-xs shadow-md">
                <div className="font-semibold text-ink-900">{d.name}</div>
                <div className="mt-1 text-label">
                  行動量: <span className="font-medium text-ink-900">{num(d.x)}件</span>
                </div>
                <div className="text-label">
                  決済粗利:{" "}
                  <span className="font-medium text-ink-900">{d.y.toLocaleString()}万円</span>
                </div>
                <div className="text-label">
                  契約: <span className="font-medium text-ink-900">{d.contracts}件</span>
                </div>
                <div className="mt-1 font-medium" style={{ color: QUADRANT_STYLE[d.quadrant].chart }}>
                  {QUADRANT_STYLE[d.quadrant].mark} {d.quadrant}
                </div>
              </div>
            );
          }}
        />
        <Scatter
          data={data}
          onClick={(e: any) => onSelect?.(e?.repId)}
          cursor={onSelect ? "pointer" : "default"}
        >
          {data.map((d) => (
            <Cell key={d.repId} fill={QUADRANT_STYLE[d.quadrant].chart} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
