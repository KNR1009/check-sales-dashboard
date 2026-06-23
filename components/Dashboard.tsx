"use client";

import { useEffect, useMemo, useState } from "react";
import { buildSummaries } from "@/lib/analysis";
import { AS_OF_DATE, PERIOD_END, PERIOD_START } from "@/lib/data";
import ManagementView from "@/components/ManagementView";
import IndividualView from "@/components/IndividualView";

type View = "management" | "individual";

export default function Dashboard() {
  const summaries = useMemo(() => buildSummaries(), []);
  const [view, setView] = useState<View>("management");
  const [repId, setRepId] = useState<string>(summaries[0]?.rep.id ?? "");

  // Recharts はゼロ幅の SSR でティック生成に失敗するため、マウント後にのみ描画する
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = summaries.find((s) => s.rep.id === repId) ?? summaries[0];

  const selectRep = (id: string) => {
    if (!id) return;
    setRepId(id);
    setView("individual");
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6">
      {/* ヘッダー（タイトル＋メタ情報：ガイド Do #12） */}
      <header className="mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink-900">営業管理ダッシュボード</h1>
            <p className="mt-0.5 text-sm text-label">
              行動量 × 成果の可視化と AI 考察 ｜ 株式会社サードスコープ
            </p>
          </div>
          <div className="text-right text-xs text-label">
            <div>
              対象期間：{PERIOD_START} 〜 {PERIOD_END}（直近12週）
            </div>
            <div>基準日：{AS_OF_DATE} ｜ 出典：日報フォーム・契約/入出金シート（ダミーデータ）</div>
          </div>
        </div>

        {/* ビュー切替＋担当者セレクタ（フィルターは上部：ガイド準拠） */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
            <button
              onClick={() => setView("management")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                view === "management"
                  ? "bg-blue-900 text-white"
                  : "text-ink-700 hover:bg-surface-control"
              }`}
            >
              マネジメントビュー
            </button>
            <button
              onClick={() => setView("individual")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                view === "individual"
                  ? "bg-blue-900 text-white"
                  : "text-ink-700 hover:bg-surface-control"
              }`}
            >
              個人ビュー
            </button>
          </div>

          {view === "individual" && (
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-label">担当者</span>
              <select
                value={repId}
                onChange={(e) => setRepId(e.target.value)}
                className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-900"
              >
                {summaries.map((s) => (
                  <option key={s.rep.id} value={s.rep.id}>
                    {s.rep.name}（{s.rep.team}）
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </header>

      {!mounted ? (
        <div className="flex h-64 items-center justify-center text-sm text-label">
          ダッシュボードを読み込み中…
        </div>
      ) : view === "management" ? (
        <ManagementView summaries={summaries} onSelectRep={selectRep} />
      ) : (
        current && <IndividualView summary={current} allSummaries={summaries} />
      )}
    </div>
  );
}
