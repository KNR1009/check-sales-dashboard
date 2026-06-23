// ダッシュボードで扱うドメインの型定義
// 要件定義書 6章「データ要件」に対応

export type TeamId = string; // 例 "売買1課"

export interface Rep {
  id: string;
  name: string;
  team: TeamId;
  role: "メンバー" | "リーダー";
}

/** 日報＝行動データ（要件 6.1）。1営業・1営業日あたり1レコード。
 *  不動産営業で実際に使う手法に合わせて区分を細分化。 */
export interface DailyActivity {
  date: string; // YYYY-MM-DD
  repId: string;
  telApo: number; // 架電（テレアポ）件数
  dm: number; // DM送付件数
  posting: number; // ポスティング件数
  visits: number; // 訪問（飛び込み含む）件数
  vacantSurvey: number; // 空き家調査件数
  bankVisits: number; // 銀行訪問件数
  followUp: number; // 追客・反響対応件数
  validLeads: number; // 有効リード件数（ニーズありそうだった件数）
}

/** 行動量の区分定義（表示ラベルと集計キーの単一ソース） */
export const ACTIVITY_FIELDS = [
  { key: "telApo", label: "架電" },
  { key: "dm", label: "DM送付" },
  { key: "posting", label: "ポスティング" },
  { key: "visits", label: "訪問" },
  { key: "vacantSurvey", label: "空き家調査" },
  { key: "bankVisits", label: "銀行訪問" },
  { key: "followUp", label: "追客・反響対応" },
] as const;

export type ActivityKey = (typeof ACTIVITY_FIELDS)[number]["key"];

/** 1日の行動量合計 */
export function dailyTotal(a: DailyActivity): number {
  return (
    a.telApo +
    a.dm +
    a.posting +
    a.visits +
    a.vacantSurvey +
    a.bankVisits +
    a.followUp
  );
}

export type DealStatus =
  | "リード"
  | "商談中"
  | "買付"
  | "契約"
  | "決済";

/** 成果データ＝契約シート（要件 6.2） */
export interface Deal {
  id: string;
  repId: string;
  property: string; // 物件名
  customer: string; // 顧客名
  status: DealStatus;
  dealType: "買い切り再販" | "仲介";
  salesAmount: number; // 売上額（円）
  cost: number; // 原価（円・買い切り再販のみ）
  grossProfit: number; // 粗利（円）
  contractDate: string | null; // 契約日
  settlementDate: string | null; // 決済日（入金完了日）
  lastContactDate: string; // 最終接触日（ネクストアクション判定用）
}

/** 集計済みの個人サマリー（分析の入力） */
export interface RepSummary {
  rep: Rep;
  // 行動量（軸①）
  telApo: number;
  dm: number;
  posting: number;
  visits: number;
  vacantSurvey: number;
  bankVisits: number;
  followUp: number;
  validLeads: number;
  totalActivity: number; // 全区分の合計
  // 成果（軸②）
  contractCount: number; // 契約以上の件数
  settledCount: number; // 決済済み件数
  salesAmount: number; // 決済済み売上
  grossProfit: number; // 決済済み粗利
  incentive: number; // 個人別インセンティブ到達額
  // 派生指標
  conversionRate: number; // 契約件数 / 有効リード
  activityPerContract: number; // 行動量 / 契約件数
  // 前週比（軸③）
  activityWoW: number; // 行動量の対前週比（%）
  // 分類（軸③）
  quadrant: Quadrant;
}

export type Quadrant =
  | "効率型" // 低活動・高成果
  | "理想型" // 高活動・高成果
  | "改善必要" // 高活動・低成果（リスト/トーク/進め方）
  | "活動不足"; // 低活動・低成果

export interface WeeklyPoint {
  week: string; // 例 "5/26週"
  totalActivity: number;
  validLeads: number;
  contracts: number;
}

/** 軸④ AI考察レポート */
export interface AiInsight {
  repId: string;
  headline: string; // 一言評価
  diagnosis: string[]; // 評価マニュアルに基づく考察
  nextActions: NextAction[];
  severity: "good" | "watch" | "alert";
}

export interface NextAction {
  title: string;
  detail: string;
  priority: "高" | "中" | "低";
}
