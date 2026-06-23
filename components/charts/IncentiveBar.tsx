"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RepSummary } from "@/lib/types";
import { toManYen } from "@/lib/format";

interface Props {
  summaries: RepSummary[];
  highlightId?: string;
}

// 個人別インセンティブ到達額（降順＝意味のある順列：ガイド Do #2）。原点0。
export default function IncentiveBar({ summaries, highlightId }: Props) {
  const data = [...summaries]
    .sort((a, b) => b.incentive - a.incentive)
    .map((s) => ({
      name: s.rep.name,
      repId: s.rep.id,
      man: toManYen(s.incentive),
    }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 26)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 4, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#626264" }}
          stroke="#CCCCCC"
          unit="万"
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#1A1A1A" }}
          stroke="#CCCCCC"
          width={84}
          interval={0}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString()}万円`, "インセンティブ"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #CCCCCC" }}
        />
        <Bar dataKey="man" radius={[0, 4, 4, 0]} maxBarSize={26}>
          {data.map((d) => (
            <Cell
              key={d.repId}
              fill={highlightId === d.repId ? "#0017C1" : "#3460FB"}
            />
          ))}
          <LabelList
            dataKey="man"
            position="right"
            formatter={(v: number) => `${v.toLocaleString()}万`}
            style={{ fontSize: 11, fill: "#1A1A1A", fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
