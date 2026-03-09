import SunCalc from "suncalc";

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * SunCalc.getMoonIllumination(date)
 * - fraction: 0..1 (明るさ)
 * - phase: 0..1 (0=新月, 0.5=満月)
 */
export function getMoonInfo(date = new Date()) {
  const m = SunCalc.getMoonIllumination(date);
  const fraction = Number(m.fraction);
  const phase = Number(m.phase);

  // 月齢っぽい値（だいたい）
  const ageDays = phase * 29.53;

  // 新月/満月に近いほど高い
  const distToNew = Math.min(phase, 1 - phase); // 0が新月
  const distToFull = Math.abs(phase - 0.5);     // 0が満月

  const closeness = 1 - Math.min(distToNew, distToFull) / 0.25; // 0..1
  const peak = clamp01(closeness);

  // 0.85〜1.15 倍（新月/満月付近で +15%）
  const multiplier = 0.85 + 0.30 * peak;

  const label =
    distToNew < 0.06 ? "新月付近" :
    distToFull < 0.06 ? "満月付近" :
    "中潮〜小潮";

  return { fraction, phase, ageDays, multiplier, label };
}

export function formatMoonText(moon) {
  const pct = Math.round(moon.fraction * 100);
  return `${moon.label} / 月齢 ${moon.ageDays.toFixed(1)} / 照度 ${pct}% / 月ボーナス x${moon.multiplier.toFixed(2)}`;
}