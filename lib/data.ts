import type { DailyActivity, Deal, DealStatus, Rep, TeamId } from "./types";
import { dailyTotal } from "./types";

// ----------------------------------------------------------------------------
// 決定論的な擬似乱数（mulberry32）。
// データを固定し、SSR と CSR で値がブレない（ハイドレーション不一致を防ぐ）。
// ※ これはあくまで「リアルなダミーデータ」。実運用では Google フォーム/シート由来に差し替える。
// ----------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function lerp(rng: () => number, range: [number, number]): number {
  return range[0] + rng() * (range[1] - range[0]);
}

// 分析期間: 12週間（2026-03-30 〜 2026-06-21）。基準日は 2026-06-23。
export const PERIOD_START = "2026-03-30";
export const PERIOD_END = "2026-06-21";
export const AS_OF_DATE = "2026-06-23";
export const PERIOD_WEEKS = 12;

export const TEAMS: TeamId[] = ["売買1課", "売買2課", "仲介1課", "仲介2課"];

// ----------------------------------------------------------------------------
// 営業担当者（30名）をアーキタイプから決定論的に生成
// ----------------------------------------------------------------------------
interface Archetype {
  act: number; // 行動量の強度（0.15〜1.4目安）
  qual: number; // 営業の質＝リード率/成約率の素（0〜1）
  trend: number; // 直近トレンド（>1 加速, <1 失速）
  avgDealProfit: number; // 1契約あたり平均粗利（円）
}

interface RepSeed extends Rep {
  archetype: Archetype;
  seed: number;
}

const SURNAMES = [
  "佐々木", "田中", "鈴木", "高橋", "伊藤", "渡辺", "山本", "中村",
  "小林", "加藤", "吉田", "山田", "佐藤", "松本", "井上", "木村",
  "林", "斎藤", "清水", "山口", "森", "池田", "橋本", "石川",
  "前田", "藤田", "後藤", "岡田", "長谷川", "村上",
];
const GIVEN = [
  "健太", "美咲", "大輔", "直樹", "彩花", "翔太", "葵", "拓海",
  "優子", "亮介", "麻衣", "和也", "里奈", "悠斗", "千尋", "竜也",
  "彩乃", "翔", "美穂", "陽介", "大樹", "結衣", "蓮", "莉子",
  "颯太", "七海", "大和", "凛", "湊", "美月",
];

// 30名のアーキタイプ配分（散布図が4象限に分かれるよう設計）
function buildArchetypes(): Archetype[] {
  const rng = mulberry32(4242);
  const plan: Array<{
    n: number;
    act: [number, number];
    qual: [number, number];
    trend: [number, number];
  }> = [
    // 理想型寄り：高活動・高質
    { n: 5, act: [0.9, 1.35], qual: [0.7, 1.0], trend: [0.98, 1.12] },
    // 改善必要寄り：高活動・低質（行動の割に成果が出ない）
    { n: 7, act: [0.85, 1.35], qual: [0.12, 0.42], trend: [0.95, 1.1] },
    // 効率型寄り：低〜中活動・高質
    { n: 6, act: [0.25, 0.6], qual: [0.68, 1.0], trend: [0.96, 1.1] },
    // 活動不足寄り：低活動・低質
    { n: 6, act: [0.15, 0.45], qual: [0.1, 0.4], trend: [0.65, 0.95] },
    // 中庸：中活動・中質
    { n: 6, act: [0.5, 0.82], qual: [0.42, 0.66], trend: [0.95, 1.12] },
  ];

  const out: Archetype[] = [];
  for (const p of plan) {
    for (let i = 0; i < p.n; i++) {
      const qual = lerp(rng, p.qual);
      out.push({
        act: lerp(rng, p.act),
        qual,
        trend: lerp(rng, p.trend),
        avgDealProfit: Math.round(2_300_000 + qual * 3_200_000 + rng() * 800_000),
      });
    }
  }
  // チーム・名前がアーキタイプに偏らないよう決定論的にシャッフル
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildReps(): RepSeed[] {
  const archetypes = buildArchetypes();
  return archetypes.map((archetype, i) => {
    const id = `r${String(i + 1).padStart(2, "0")}`;
    const name = `${SURNAMES[i % SURNAMES.length]} ${GIVEN[i % GIVEN.length]}`;
    const team = TEAMS[i % TEAMS.length];
    // 各チームの先頭1名をリーダーに
    const role: Rep["role"] = i < TEAMS.length ? "リーダー" : "メンバー";
    return { id, name, team, role, archetype, seed: 1000 + i * 37 };
  });
}

export const REPS: RepSeed[] = buildReps();

export const REPS_PUBLIC: Rep[] = REPS.map(({ id, name, team, role }) => ({
  id,
  name,
  team,
  role,
}));

// ----------------------------------------------------------------------------
// 日付ユーティリティ（必ず UTC：ローカルTZの toISOString ずれを防ぐ）
// ----------------------------------------------------------------------------
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isWeekday(iso: string): boolean {
  const day = new Date(iso + "T00:00:00Z").getUTCDay();
  return day !== 0 && day !== 6;
}

export function workdays(): string[] {
  const days: string[] = [];
  let cur = PERIOD_START;
  while (cur <= PERIOD_END) {
    if (isWeekday(cur)) days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function weekIndex(iso: string): number {
  const start = new Date(PERIOD_START + "T00:00:00Z").getTime();
  const cur = new Date(iso + "T00:00:00Z").getTime();
  return Math.floor((cur - start) / (7 * 24 * 3600 * 1000));
}

// ----------------------------------------------------------------------------
// 行動量の上限（act 強度から各区分の1日あたり最大値を導出）
// ----------------------------------------------------------------------------
function dailyCaps(act: number) {
  return {
    telApo: Math.round(6 + act * 26),
    dm: Math.round(3 + act * 20),
    posting: Math.round(act * 32),
    visits: Math.round(1 + act * 5),
    vacantSurvey: Math.round(act * 9),
    bankVisits: Math.round(act * 2.4),
    followUp: Math.round(2 + act * 11),
  };
}

// 有効リードへの寄与度（チャネル別）。ポスティング/DMは母数は多いが反応は低い、
// 訪問/追客は反応率が高い、という不動産営業の実態を反映。
function leadReach(v: {
  telApo: number;
  dm: number;
  posting: number;
  visits: number;
  vacantSurvey: number;
  followUp: number;
}): number {
  return (
    v.telApo * 0.45 +
    v.dm * 0.12 +
    v.posting * 0.07 +
    v.visits * 1.4 +
    v.vacantSurvey * 0.6 +
    v.followUp * 1.0
  );
}

// 質（qual）から導く転換率
const leadRate = (qual: number) => 0.02 + qual * 0.05; // 有効リード化率
const closeRate = (qual: number) => 0.02 + qual * 0.06; // 有効リード→契約率

// ----------------------------------------------------------------------------
// 行動データ（日報）生成
// ----------------------------------------------------------------------------
export function generateActivities(): DailyActivity[] {
  const out: DailyActivity[] = [];
  const days = workdays();

  for (const rep of REPS) {
    const rng = mulberry32(rep.seed);
    const a = rep.archetype;
    const caps = dailyCaps(a.act);
    const lr = leadRate(a.qual);

    for (const date of days) {
      const wi = weekIndex(date);
      const trendFactor =
        1 + (a.trend - 1) * (wi / Math.max(1, PERIOD_WEEKS - 1));

      // 外出・休暇等で活動ゼロの日（失速タイプは多め）
      const dayOff = rng() < (a.trend < 0.85 ? 0.28 : 0.12);
      if (dayOff) {
        out.push({
          date,
          repId: rep.id,
          telApo: 0,
          dm: 0,
          posting: 0,
          visits: 0,
          vacantSurvey: 0,
          bankVisits: 0,
          followUp: 0,
          validLeads: 0,
        });
        continue;
      }

      const draw = (cap: number) =>
        Math.max(0, Math.round(randInt(rng, Math.floor(cap * 0.35), cap) * trendFactor));

      const telApo = draw(caps.telApo);
      const dm = draw(caps.dm);
      const posting = draw(caps.posting);
      const visits = draw(caps.visits);
      const vacantSurvey = draw(caps.vacantSurvey);
      const bankVisits = draw(caps.bankVisits);
      const followUp = draw(caps.followUp);

      // 有効リードはチャネル別の寄与度で重み付け（銀行訪問はリード母数に含めない）
      const reach = leadReach({ telApo, dm, posting, visits, vacantSurvey, followUp });
      const validLeads = Math.round(reach * lr * (0.7 + rng() * 0.6));

      out.push({
        date,
        repId: rep.id,
        telApo,
        dm,
        posting,
        visits,
        vacantSurvey,
        bankVisits,
        followUp,
        validLeads,
      });
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// 成果データ（契約）生成
// ----------------------------------------------------------------------------
const PROPERTIES = [
  "中野区中央 区分マンション",
  "練馬区豊玉 戸建",
  "板橋区常盤台 一棟アパート",
  "杉並区高円寺 区分",
  "世田谷区桜新町 戸建",
  "江戸川区一之江 一棟",
  "豊島区南長崎 区分",
  "足立区竹ノ塚 戸建",
  "北区赤羽 一棟アパート",
  "品川区戸越 区分",
  "大田区蒲田 戸建",
  "墨田区錦糸町 区分",
];

const CUSTOMERS = [
  "山田不動産投資",
  "個人投資家 A",
  "個人投資家 B",
  "合同会社レジデンス",
  "個人投資家 C",
  "株式会社みらい資産",
  "個人投資家 D",
  "資産管理法人 E",
  "個人投資家 F",
  "株式会社東京家守",
];

const STATUS_FLOW: DealStatus[] = ["リード", "商談中", "買付", "契約", "決済"];

export function generateDeals(): Deal[] {
  const out: Deal[] = [];
  const days = workdays().length;

  for (const rep of REPS) {
    const rng = mulberry32(rep.seed + 50);
    const a = rep.archetype;
    const caps = dailyCaps(a.act);

    // 日次の重み付きリード母数（drawの平均≒capの0.67）
    const dailyReach =
      leadReach({
        telApo: caps.telApo,
        dm: caps.dm,
        posting: caps.posting,
        visits: caps.visits,
        vacantSurvey: caps.vacantSurvey,
        followUp: caps.followUp,
      }) * 0.67;
    const approxLeads = days * dailyReach * leadRate(a.qual) * 0.85;
    const approxContracts = Math.max(
      0,
      Math.round(approxLeads * closeRate(a.qual)),
    );

    const pipelineCount = randInt(rng, 2, 5);
    const total = approxContracts + pipelineCount;

    for (let i = 0; i < total; i++) {
      const isClosed = i < approxContracts;
      let status: DealStatus;
      if (isClosed) {
        status = rng() < 0.7 ? "決済" : "契約";
      } else {
        status = STATUS_FLOW[randInt(rng, 0, 2)];
      }

      const profit = Math.round(a.avgDealProfit * (0.7 + rng() * 0.6));
      const dealType: Deal["dealType"] = rng() < 0.65 ? "買い切り再販" : "仲介";
      const grossProfit = profit;
      const cost =
        dealType === "買い切り再販"
          ? Math.round(profit * (3 + rng() * 4))
          : 0;
      const salesAmount = cost + grossProfit;

      const baseDay = randInt(rng, Math.floor(days * 0.2), days - 1);
      const contractDate =
        status === "契約" || status === "決済" ? offsetWorkday(baseDay) : null;
      const settlementDate =
        status === "決済"
          ? offsetWorkday(Math.min(days - 1, baseDay + randInt(rng, 10, 25)))
          : null;
      const lastContactDate = offsetWorkday(
        Math.min(days - 1, baseDay + (isClosed ? 0 : randInt(rng, -2, 18))),
      );

      out.push({
        id: `${rep.id}-d${i}`,
        repId: rep.id,
        property: PROPERTIES[randInt(rng, 0, PROPERTIES.length - 1)],
        customer: CUSTOMERS[randInt(rng, 0, CUSTOMERS.length - 1)],
        status,
        dealType,
        salesAmount,
        cost,
        grossProfit,
        contractDate,
        settlementDate,
        lastContactDate,
      });
    }
  }
  return out;
}

function offsetWorkday(index: number): string {
  const days = workdays();
  return days[Math.min(days.length - 1, Math.max(0, index))];
}

// 再エクスポート（他モジュールの利便のため）
export { dailyTotal };

// ----------------------------------------------------------------------------
// インセンティブ（要件 6.3）。決済済み粗利の一定率の簡易モデル。
// ----------------------------------------------------------------------------
export const INCENTIVE_RATE = 0.05; // 決済粗利の5%
