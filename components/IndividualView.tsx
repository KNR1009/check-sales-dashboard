"use client";

import { useMemo } from "react";
import type { RepSummary } from "@/lib/types";
import { ACTIVITY_FIELDS } from "@/lib/types";
import {
  buildInsight,
  buildWeekly,
  getDeals,
  staleCustomers,
} from "@/lib/analysis";
import { AS_OF_DATE } from "@/lib/data";
import { KpiCard, QuadrantBadge, SeverityDot, Trend } from "@/components/ui";
import { num, ratioPct, yen } from "@/lib/format";
import WeeklyTrendChart from "@/components/charts/WeeklyTrendChart";

interface Props {
  summary: RepSummary;
  allSummaries: RepSummary[];
}

const PRIORITY_STYLE: Record<string, string> = {
  高: "bg-danger-50 text-danger-900 border-danger-200",
  中: "bg-warn-50 text-warn-900 border-warn-200",
  低: "bg-blue-50 text-blue-900 border-blue-200",
};

export default function IndividualView({ summary, allSummaries }: Props) {
  const s = summary;
  const insight = useMemo(
    () => buildInsight(s, allSummaries),
    [s, allSummaries],
  );
  const weekly = useMemo(() => buildWeekly(s.rep.id), [s.rep.id]);
  const stale = useMemo(() => staleCustomers(s.rep.id), [s.rep.id]);
  const pipeline = useMemo(
    () =>
      getDeals().filter(
        (d) => d.repId === s.rep.id && d.status !== "決済",
      ),
    [s.rep.id],
  );

  // 行動量内訳（チーム平均比較）。区分は ACTIVITY_FIELDS を単一ソースに
  const breakdown = useMemo(() => {
    const n = allSummaries.length || 1;
    return ACTIVITY_FIELDS.map(({ key, label }) => ({
      label,
      value: s[key],
      avg: allSummaries.reduce((acc, x) => acc + x[key], 0) / n,
    }));
  }, [s, allSummaries]);
  const maxBreakdown = Math.max(...breakdown.map((b) => Math.max(b.value, b.avg)), 1);

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-ink-900">{s.rep.name}</h2>
        <span className="text-sm text-label">
          {s.rep.team}・{s.rep.role}
        </span>
        <QuadrantBadge q={s.quadrant} />
        <Trend value={s.activityWoW} />
      </div>

      {/* 個人KPI */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="行動量（期間合計）" value={num(s.totalActivity)} unit="件" />
        <KpiCard
          label="有効リード"
          value={num(s.validLeads)}
          unit="件"
          sub={<span className="text-label">転換率 {ratioPct(s.conversionRate)}</span>}
        />
        <KpiCard
          label="契約 / 決済"
          value={`${s.contractCount} / ${s.settledCount}`}
          unit="件"
        />
        <KpiCard
          label="インセンティブ到達"
          value={yen(s.incentive)}
          tone="primary"
          sub={<span className="text-blue-50">決済粗利 {yen(s.grossProfit)}</span>}
        />
      </section>

      {/* AI考察レポート（軸④） */}
      <section className="card border-l-4 border-l-blue-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-900 px-2 py-0.5 text-xs font-semibold text-white">
              AI考察
            </span>
            <h3 className="text-sm font-bold text-ink-900">{insight.headline}</h3>
          </div>
          <SeverityDot severity={insight.severity} />
        </div>
        <ul className="mt-3 space-y-2">
          {insight.diagnosis.map((d, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-700">
              <span className="mt-1 text-blue-600" aria-hidden>
                ▪
              </span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-label">
          ※ 評価マニュアル（行動量×成果の4象限）に基づく自動考察。実運用ではClaude APIで生成・更新します。
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* ネクストアクション（F-09） */}
        <section className="card">
          <h3 className="card-title">ネクストアクション</h3>
          <p className="card-sub mb-3">考察から導いた「次の一手」</p>
          {insight.nextActions.length === 0 ? (
            <p className="text-sm text-label">
              現状維持で問題ありません。良い進め方をチームに共有してください。
            </p>
          ) : (
            <ol className="space-y-3">
              {insight.nextActions.map((a, i) => (
                <li key={i} className="rounded-lg border border-ink-50 bg-surface-base p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[a.priority]}`}
                    >
                      優先度{a.priority}
                    </span>
                    <span className="text-sm font-semibold text-ink-900">{a.title}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{a.detail}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* 行動量内訳（チーム平均比較） */}
        <section className="card">
          <h3 className="card-title">行動量の内訳（チーム平均比較）</h3>
          <p className="card-sub mb-3">濃い棒＝本人、薄い線＝チーム平均</p>
          <div className="space-y-3">
            {breakdown.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-ink-900">{b.label}</span>
                  <span className="tabular-nums text-label">
                    {num(b.value)}件
                    <span className="ml-2">平均 {b.avg.toFixed(0)}件</span>
                  </span>
                </div>
                <div className="relative h-3 w-full rounded-full bg-surface-control">
                  <div
                    className={`h-3 rounded-full ${
                      b.value >= b.avg ? "bg-blue-600" : "bg-warn-400"
                    }`}
                    style={{ width: `${(b.value / maxBreakdown) * 100}%` }}
                  />
                  <div
                    className="absolute top-[-2px] h-[18px] w-0.5 bg-ink-900"
                    style={{ left: `${(b.avg / maxBreakdown) * 100}%` }}
                    aria-label={`チーム平均 ${b.avg.toFixed(0)}件`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 個人の週次推移 */}
      <section className="card">
        <h3 className="card-title">週次推移（{s.rep.name}）</h3>
        <p className="card-sub mb-2">棒＝行動量/有効リード、線＝契約件数</p>
        <WeeklyTrendChart data={weekly} />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* 未アプローチ顧客 */}
        <section className="card">
          <h3 className="card-title">フォロー切れの顧客（14日以上未接触）</h3>
          <p className="card-sub mb-3">基準日 {AS_OF_DATE} 時点。返信のない顧客への再アプローチ候補</p>
          {stale.length === 0 ? (
            <p className="text-sm text-label">未接触が続く案件はありません。</p>
          ) : (
            <ul className="space-y-2">
              {stale.slice(0, 6).map(({ deal, daysSinceContact }) => (
                <li
                  key={deal.id}
                  className="flex items-center justify-between rounded-lg border border-warn-200 bg-warn-50 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-ink-900">{deal.customer}</div>
                    <div className="text-xs text-label">
                      {deal.property}・{deal.status}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-warn-900 tabular-nums">
                    {daysSinceContact}日経過
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* パイプライン */}
        <section className="card">
          <h3 className="card-title">パイプライン（進行中の案件）</h3>
          <p className="card-sub mb-3">買付前〜契約手前のステータス別</p>
          {pipeline.length === 0 ? (
            <p className="text-sm text-label">進行中の案件はありません。</p>
          ) : (
            <ul className="space-y-2">
              {pipeline.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-ink-50 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-ink-900">{d.property}</div>
                    <div className="text-xs text-label">
                      {d.customer}・{d.dealType}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-surface-control px-2 py-0.5 text-xs font-medium text-ink-700">
                      {d.status}
                    </span>
                    <div className="mt-0.5 text-xs text-label tabular-nums">
                      想定粗利 {yen(d.grossProfit)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
