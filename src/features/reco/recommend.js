import { windScoreAtTime } from "../wind/windScore.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const mid = (b) => Math.floor((b.start + b.end) / 2);

/**
 * moonMultiplier: 0.85..1.15 みたいな倍率を想定
 */
export function buildRecommendations({
  bands,
  wind,
  seaBearingDeg,
  moonMultiplier = 1.0,
  limit = 8,
}) {
  const slots = (bands || []).map((b) => {
    const t = mid(b);
    const w = windScoreAtTime({ wind, t, seaBearingDeg });

    const bandScore = b.score ?? 0.5;
    const raw = bandScore * w.score * moonMultiplier;
    const score = clamp01(raw);

    return {
      start: b.start,
      end: b.end,
      title: b.label,
      score,
      detail: `${w.label} / 帯:${Math.round(bandScore * 100)} / 月:x${moonMultiplier.toFixed(2)}`,
    };
  });

  slots.sort((a, b) => b.score - a.score);
  return slots.slice(0, limit);
}