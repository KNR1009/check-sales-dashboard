import {
  AS_OF_DATE,
  INCENTIVE_RATE,
  PERIOD_WEEKS,
  REPS_PUBLIC,
  dailyTotal,
  generateActivities,
  generateDeals,
  workdays,
} from "./data";
import type {
  AiInsight,
  DailyActivity,
  Deal,
  NextAction,
  Quadrant,
  Rep,
  RepSummary,
  WeeklyPoint,
} from "./types";

// データは一度だけ生成してメモ化
const ACTIVITIES: DailyActivity[] = generateActivities();
const DEALS: Deal[] = generateDeals();

export function getActivities(): DailyActivity[] {
  return ACTIVITIES;
}
export function getDeals(): Deal[] {
  return DEALS;
}
export function getReps(): Rep[] {
  return REPS_PUBLIC;
}

// ----------------------------------------------------------------------------
// 個人サマリーの集計
// ----------------------------------------------------------------------------
function diffDays(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + "T00:00:00Z").getTime();
  const b = new Date(toIso + "T00:00:00Z").getTime();
  return Math.round((b - a) / (24 * 3600 * 1000));
}

function lastTwoWeekDates(): { recent: Set<string>; prior: Set<string> } {
  const days = workdays();
  const recent = new Set(days.slice(-5)); // 直近1週（平日5日）
  const prior = new Set(days.slice(-10, -5)); // その前の1週
  return { recent, prior };
}

export function buildSummaries(): RepSummary[] {
  const { recent, prior } = lastTwoWeekDates();

  const summaries = REPS_PUBLIC.map((rep): RepSummary => {
    const acts = ACTIVITIES.filter((a) => a.repId === rep.id);
    const deals = DEALS.filter((d) => d.repId === rep.id);

    const sum = (sel: (a: DailyActivity) => number) =>
      acts.reduce((acc, a) => acc + sel(a), 0);

    const telApo = sum((a) => a.telApo);
    const dm = sum((a) => a.dm);
    const posting = sum((a) => a.posting);
    const visits = sum((a) => a.visits);
    const vacantSurvey = sum((a) => a.vacantSurvey);
    const bankVisits = sum((a) => a.bankVisits);
    const followUp = sum((a) => a.followUp);
    const validLeads = sum((a) => a.validLeads);
    const totalActivity = sum(dailyTotal);

    const contractDeals = deals.filter(
      (d) => d.status === "契約" || d.status === "決済",
    );
    const settledDeals = deals.filter((d) => d.status === "決済");
    const contractCount = contractDeals.length;
    const settledCount = settledDeals.length;
    const salesAmount = settledDeals.reduce((s, d) => s + d.salesAmount, 0);
    const grossProfit = settledDeals.reduce((s, d) => s + d.grossProfit, 0);
    const incentive = Math.round(grossProfit * INCENTIVE_RATE);

    const conversionRate =
      validLeads > 0 ? contractCount / validLeads : 0;
    const activityPerContract =
      contractCount > 0 ? totalActivity / contractCount : Infinity;

    const recentAct = acts
      .filter((a) => recent.has(a.date))
      .reduce((s, a) => s + dailyTotal(a), 0);
    const priorAct = acts
      .filter((a) => prior.has(a.date))
      .reduce((s, a) => s + dailyTotal(a), 0);
    const activityWoW =
      priorAct > 0 ? ((recentAct - priorAct) / priorAct) * 100 : 0;

    return {
      rep,
      telApo,
      dm,
      posting,
      visits,
      vacantSurvey,
      bankVisits,
      followUp,
      validLeads,
      totalActivity,
      contractCount,
      settledCount,
      salesAmount,
      grossProfit,
      incentive,
      conversionRate,
      activityPerContract,
      activityWoW,
      quadrant: "活動不足", // 後で確定
    };
  });

  // 行動量・成果の中央値で象限を判定（軸③）
  const activities = summaries.map((s) => s.totalActivity);
  const results = summaries.map((s) => s.grossProfit);
  const actMed = median(activities);
  const resMed = median(results);

  for (const s of summaries) {
    s.quadrant = classify(s.totalActivity, s.grossProfit, actMed, resMed);
  }

  return summaries;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function classify(
  activity: number,
  result: number,
  actMed: number,
  resMed: number,
): Quadrant {
  const highAct = activity >= actMed;
  const highRes = result >= resMed;
  if (highAct && highRes) return "理想型";
  if (!highAct && highRes) return "効率型";
  if (highAct && !highRes) return "改善必要";
  return "活動不足";
}

// ----------------------------------------------------------------------------
// 週次トレンド（軸③：前週比の素材）
// ----------------------------------------------------------------------------
export function buildWeekly(repId?: string): WeeklyPoint[] {
  const days = workdays();
  const points: WeeklyPoint[] = [];
  const acts = repId
    ? ACTIVITIES.filter((a) => a.repId === repId)
    : ACTIVITIES;
  const deals = repId ? DEALS.filter((d) => d.repId === repId) : DEALS;

  for (let w = 0; w < PERIOD_WEEKS; w++) {
    const weekDayList = days.slice(w * 5, w * 5 + 5);
    if (weekDayList.length === 0) continue;
    const weekDays = new Set(weekDayList);
    const label = weekLabel(weekDayList[0]);

    const weekActs = acts.filter((a) => weekDays.has(a.date));
    const totalActivity = weekActs.reduce((s, a) => s + dailyTotal(a), 0);
    const validLeads = weekActs.reduce((s, a) => s + a.validLeads, 0);
    const contracts = deals.filter(
      (d) => d.contractDate && weekDays.has(d.contractDate),
    ).length;

    points.push({ week: label, totalActivity, validLeads, contracts });
  }
  return points;
}

function weekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}週`;
}

// ----------------------------------------------------------------------------
// 軸④：評価マニュアルをルール化した AI 考察・ネクストアクション
// ----------------------------------------------------------------------------
export function buildInsight(s: RepSummary, all: RepSummary[]): AiInsight {
  const teamAvgActivity = avg(all.map((x) => x.totalActivity));
  const teamAvgConversion = avg(
    all.filter((x) => x.validLeads > 0).map((x) => x.conversionRate),
  );
  const teamAvgGross = avg(all.map((x) => x.grossProfit));

  const diagnosis: string[] = [];
  const nextActions: NextAction[] = [];
  let severity: AiInsight["severity"] = "watch";
  let headline = "";

  const actRatio = teamAvgActivity > 0 ? s.totalActivity / teamAvgActivity : 1;
  const convRatio =
    teamAvgConversion > 0 ? s.conversionRate / teamAvgConversion : 1;

  // 評価マニュアルの考え方（軸③の4象限）に沿った所見
  switch (s.quadrant) {
    case "理想型":
      headline = "行動量・成果ともに高水準。チームの基準値";
      severity = "good";
      diagnosis.push(
        `行動量はチーム平均の${pct(actRatio)}、成約転換率も平均比${pct(convRatio)}と高く、量・質の両立ができています。`,
      );
      diagnosis.push(
        "現状の進め方を言語化し、チーム内のトークスクリプト・リスト選定の標準にすることで全体の底上げが見込めます。",
      );
      break;
    case "効率型":
      headline = "少ない行動量で成約。伸びしろは活動量の上積み";
      severity = "good";
      diagnosis.push(
        `成約転換率は平均比${pct(convRatio)}と高い一方、行動量は平均の${pct(actRatio)}に留まります。質は高く「効率型」です。`,
      );
      diagnosis.push(
        "行動量をあと2〜3割積み増せば、同じ質のまま成果の絶対額を伸ばせる可能性が高いです。",
      );
      nextActions.push({
        title: "テレアポ/訪問の母数を引き上げる",
        detail: `現在の週あたり行動量を約${Math.round((s.totalActivity / PERIOD_WEEKS) * 0.25)}件上積みする目標を設定。質が高いため母数増がそのまま成約増につながりやすい。`,
        priority: "中",
      });
      break;
    case "改善必要":
      headline = "行動量は十分。成約に結びつかず質に課題";
      severity = "alert";
      diagnosis.push(
        `行動量はチーム平均の${pct(actRatio)}と多いものの、成約転換率は平均比${pct(convRatio)}に留まります。「行動の割に成果が出ていない」典型で、リスト・トーク・進め方のいずれかにボトルネックがあります。`,
      );
      if (s.validLeads > 0 && s.conversionRate < teamAvgConversion * 0.7) {
        diagnosis.push(
          "有効リードは取れているのに契約に至っていないため、クロージング／提案フェーズに課題がある可能性が高いです（ターゲットの見極めより、商談中盤以降の進め方）。",
        );
      } else {
        diagnosis.push(
          "有効リード率自体が低い場合は、アプローチ先リストの質か初回トークの刺さりに課題がある可能性があります。",
        );
      }
      nextActions.push({
        title: "上位者との同行・ロープレでトークを点検",
        detail:
          "理想型メンバー（佐々木さん等）の商談に同行し、刺さっている問いかけ・クロージング手順を3つ言語化して自分の型に取り込む。",
        priority: "高",
      });
      nextActions.push({
        title: "アプローチリストの絞り込み",
        detail:
          "成約済み顧客の属性（エリア・物件種別・投資目的）を逆引きし、似た属性のリストへ行動量を再配分する。",
        priority: "高",
      });
      break;
    case "活動不足":
      headline = "行動量が不足。まず動く量を確保する段階";
      severity = "alert";
      diagnosis.push(
        `行動量がチーム平均の${pct(actRatio)}と少なく、成果の手前で母数が足りていません。評価マニュアル上、まず「そもそも行動しているか」をクリアする必要があります。`,
      );
      if (s.activityWoW < -10) {
        diagnosis.push(
          `直近の行動量は前週比 ${s.activityWoW.toFixed(0)}% と失速しており、早期のテコ入れが必要です。`,
        );
      }
      nextActions.push({
        title: "1日あたりの最低行動量を約束する",
        detail:
          "テレアポ◯件・訪問◯件など、日次の下限を本人と合意し、日報フォームで毎日記録。まずは2週間、量の確保にフォーカスする。",
        priority: "高",
      });
      break;
  }

  // 行動量の内訳に基づく具体的指摘
  if (s.bankVisits === 0) {
    diagnosis.push(
      "銀行訪問が期間中0件です。買い切り再販では融資付けが成約速度を左右するため、金融機関接点を持つことを推奨します。",
    );
  }
  if (s.telApo > 0 && s.visits / Math.max(1, s.telApo) < 0.08) {
    nextActions.push({
      title: "テレアポ→訪問の転換を上げる",
      detail:
        "架電数の割に訪問アポが取れていません。トークの「会う理由づくり」を見直す（資料持参・現地確認の提案など）。",
      priority: "中",
    });
  }

  return {
    repId: s.rep.id,
    headline,
    diagnosis,
    nextActions,
    severity,
  };
}

// ----------------------------------------------------------------------------
// ネクストアクション：未アプローチ顧客の検出（F-09）
// ----------------------------------------------------------------------------
export interface StaleCustomer {
  deal: Deal;
  daysSinceContact: number;
}

export function staleCustomers(repId: string, thresholdDays = 14): StaleCustomer[] {
  return DEALS.filter(
    (d) =>
      d.repId === repId &&
      d.status !== "決済" &&
      d.status !== "契約",
  )
    .map((deal) => ({
      deal,
      daysSinceContact: diffDays(deal.lastContactDate, AS_OF_DATE),
    }))
    .filter((x) => x.daysSinceContact >= thresholdDays)
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

// 全社サマリー（KPIカード用）
export function companyTotals(summaries: RepSummary[]) {
  return {
    totalActivity: summaries.reduce((s, x) => s + x.totalActivity, 0),
    validLeads: summaries.reduce((s, x) => s + x.validLeads, 0),
    contractCount: summaries.reduce((s, x) => s + x.contractCount, 0),
    settledCount: summaries.reduce((s, x) => s + x.settledCount, 0),
    salesAmount: summaries.reduce((s, x) => s + x.salesAmount, 0),
    grossProfit: summaries.reduce((s, x) => s + x.grossProfit, 0),
    incentive: summaries.reduce((s, x) => s + x.incentive, 0),
  };
}
