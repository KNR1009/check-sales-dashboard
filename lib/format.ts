// 表示用フォーマッタ（単位を必ず明記＝デジタル庁ガイド Do #6）

/** 円 → 「◯◯万円」/「◯.◯億円」 */
export function yen(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2)}億円`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString()}万円`;
  }
  return `${value.toLocaleString()}円`;
}

/** 万円単位の数値（グラフ用） */
export function toManYen(value: number): number {
  return Math.round(value / 10_000);
}

export function num(value: number): string {
  return value.toLocaleString();
}

export function signedPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

export function ratioPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
