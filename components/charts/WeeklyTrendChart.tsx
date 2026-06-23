"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyPoint } from "@/lib/types";

interface Props {
  data: WeeklyPoint[];
}

// 行動量（棒）と契約件数（折れ線）の二軸。時系列＝折れ線/棒（ガイド準拠）
export default function WeeklyTrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "#626264" }}
          stroke="#CCCCCC"
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "#626264" }}
          stroke="#CCCCCC"
          allowDecimals={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "#626264" }}
          stroke="#CCCCCC"
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #CCCCCC",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="left"
          dataKey="totalActivity"
          name="行動量（件）"
          fill="#C5D7FB"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          yAxisId="left"
          dataKey="validLeads"
          name="有効リード（件）"
          fill="#3460FB"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="contracts"
          name="契約（件）"
          stroke="#CE0000"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#CE0000" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
