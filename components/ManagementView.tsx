"use client";

import { useMemo } from "react";
import type { RepSummary } from "@/lib/types";
import { buildWeekly, companyTotals } from "@/lib/analysis";
import { KpiCard, QuadrantBadge, QUADRANT_STYLE } from "@/components/ui";
import { num, ratioPct, yen } from "@/lib/format";
import ActivityResultScatter from "@/components/charts/ActivityResultScatter";
import WeeklyTrendChart from "@/components/charts/WeeklyTrendChart";
import IncentiveBar from "@/components/charts/IncentiveBar";

interface Props {
  summaries: RepSummary[];
  onSelectRep: (repId: string) => void;
}

export default function ManagementView({ summaries, onSelectRep }: Props) {
  const totals = useMemo(() => companyTotals(summaries), [summaries]);
  const weekly = useMemo(() => buildWeekly(), []);

  // ランキングは「成果（決済粗利）」降順。改善必要・活動不足を上部アラートで明示。
  const ranked = useMemo(
    () => [...summaries].sort((a, b) => b.grossProfit - a.grossProfit),
    [summaries],
  );
  const alerts = useMemo(
    () =>
      summaries.filter(
        (s) => s.quadrant === "改善必要" || s.quadrant === "活動不足",
      ),
    [summaries],
  );

  return (
    <div className="space-y-5">
      {/* KPIサマリー（全体像：ガイド Do #1） */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="決済売上（期間合計）"
          value={yen(totals.salesAmount)}
          tone="primary"
          sub={
            <span className="text-blue-50">
              粗利 {yen(totals.grossProfit)}
            </span>
          }
        />
        <KpiCard
          label="契約件数"
          value={num(totals.contractCount)}
          unit="件"
          sub={<span className="text-label">うち決済済 {totals.settledCount}件</span>}
        />
        <KpiCard
          label="行動量（架電/DM/訪問/空き家調査 等7区分）"
          value={num(totals.totalActivity)}
          unit="件"
          sub={<span className="text-label">有効リード {num(totals.validLeads)}件</span>}
        />
        <KpiCard
          label="インセンティブ到達（全社）"
          value={yen(totals.incentive)}
          sub={<span className="text-label">決済粗利の5%で試算</span>}
        />
      </section>

      {/* アラート：炙り出し（要件 1.3） */}
      {alerts.length > 0 && (
        <section className="rounded-xl border border-danger-200 bg-danger-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger-900">
            <span aria-hidden>⚠</span> 要対応メンバー（{alerts.length}名）
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {alerts.map((s) => (
              <button
                key={s.rep.id}
                onClick={() => onSelectRep(s.rep.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-danger-200 bg-white px-3 py-1.5 text-sm hover:border-danger-400"
              >
                <span className="font-medium text-ink-900">{s.rep.name}</span>
                <QuadrantBadge q={s.quadrant} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 軸③：行動量×成果 散布図（最重要） */}
      <section className="card">
        <div className="mb-1 flex items-baseline justify-between">
          <div>
            <h2 className="card-title">行動量 × 成果の相関（営業別・期間合計）</h2>
            <p className="card-sub">
              点クリックで個人ビューへ。破線は中央値。右下＝効率型、左上は不在が理想
            </p>
          </div>
        </div>
        <ActivityResultScatter summaries={summaries} onSelect={onSelectRep} />
        {/* 凡例：色＋記号（色のみに依存しない：ガイド Do #10） */}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-700">
          {(["理想型", "効率型", "改善必要", "活動不足"] as const).map((q) => (
            <span key={q} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: QUADRANT_STYLE[q].chart }}
                aria-hidden
              />
              {QUADRANT_STYLE[q].mark} {q}
              <span className="text-label">
                {q === "理想型" && "（量・質とも高）"}
                {q === "効率型" && "（少ない行動で成約）"}
                {q === "改善必要" && "（行動の割に成果なし）"}
                {q === "活動不足" && "（そもそも動いていない）"}
              </span>
            </span>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* 週次トレンド */}
        <section className="card">
          <h2 className="card-title">全社の週次推移（行動量・有効リード・契約）</h2>
          <p className="card-sub mb-2">直近12週。棒＝行動量/有効リード、線＝契約件数</p>
          <WeeklyTrendChart data={weekly} />
        </section>

        {/* インセンティブ */}
        <section className="card">
          <h2 className="card-title">個人別インセンティブ到達額</h2>
          <p className="card-sub mb-2">決済済み粗利の5%で試算（多い順）</p>
          <IncentiveBar summaries={summaries} />
        </section>
      </div>

      {/* ランキングテーブル */}
      <section className="card overflow-x-auto">
        <h2 className="card-title">営業別 行動量×成果ランキング</h2>
        <p className="card-sub mb-3">決済粗利の多い順。色＝象限分類</p>
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-xs text-label">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">担当者</th>
              <th className="py-2 pr-3 font-medium">分類</th>
              <th className="py-2 pr-3 text-right font-medium">行動量</th>
              <th className="py-2 pr-3 text-right font-medium">有効リード</th>
              <th className="py-2 pr-3 text-right font-medium">契約</th>
              <th className="py-2 pr-3 text-right font-medium">成約転換率</th>
              <th className="py-2 pr-3 text-right font-medium">決済粗利</th>
              <th className="py-2 pr-3 text-right font-medium">前週比</th>
              <th className="py-2 pr-3 text-right font-medium">インセンティブ</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => (
              <tr
                key={s.rep.id}
                onClick={() => onSelectRep(s.rep.id)}
                className="cursor-pointer border-b border-ink-50 hover:bg-surface-control"
              >
                <td className="py-2.5 pr-2 tabular-nums text-label">{i + 1}</td>
                <td className="py-2.5 pr-3">
                  <span className="font-medium text-ink-900">{s.rep.name}</span>
                  <span className="ml-1.5 text-xs text-label">{s.rep.team}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <QuadrantBadge q={s.quadrant} />
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{num(s.totalActivity)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{num(s.validLeads)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{s.contractCount}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {ratioPct(s.conversionRate)}
                </td>
                <td className="py-2.5 pr-3 text-right font-medium tabular-nums">
                  {yen(s.grossProfit)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  <span
                    className={
                      s.activityWoW >= 0 ? "text-ok-600" : "text-danger-600"
                    }
                  >
                    {s.activityWoW >= 0 ? "▲" : "▼"}
                    {Math.abs(s.activityWoW).toFixed(0)}%
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{yen(s.incentive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
