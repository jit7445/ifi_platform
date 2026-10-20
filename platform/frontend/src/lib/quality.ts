import type { Metrics } from "./api";

export type AlphaBand = "reliable" | "tentative" | "unreliable" | "insufficient_data";

/** Krippendorff bands used across the platform: 0.8 and above reliable, 0.667 to 0.8 tentative. */
export function alphaBand(alpha: number | null | undefined): AlphaBand {
  if (alpha === null || alpha === undefined || Number.isNaN(alpha)) return "insufficient_data";
  if (alpha >= 0.8) return "reliable";
  if (alpha >= 0.667) return "tentative";
  return "unreliable";
}

/** Item-weighted mean alpha across criteria that have a value. */
export function overallAlpha(m: Metrics | undefined): number | null {
  const rows = (m?.agreement ?? []).filter((a) => a.value !== null && a.n_items > 0);
  const n = rows.reduce((t, a) => t + a.n_items, 0);
  if (!n) return null;
  return rows.reduce((t, a) => t + (a.value as number) * a.n_items, 0) / n;
}
