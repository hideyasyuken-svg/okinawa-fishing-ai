export function buildInterpolatedFromExtremes(extremes, stepMinutes = 10) {
  const xs = [...extremes].sort((a, b) => a.dt - b.dt);
  if (xs.length < 2) return [];

  const out = [];
  const stepMs = stepMinutes * 60_000;

  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i];
    const b = xs[i + 1];
    const t0 = a.dt * 1000;
    const t1 = b.dt * 1000;
    if (t1 <= t0) continue;

    if (out.length === 0) out.push({ t: t0, height: a.height });

    for (let t = t0 + stepMs; t < t1; t += stepMs) {
      const u = (t - t0) / (t1 - t0); // 0..1
      const w = 0.5 - 0.5 * Math.cos(Math.PI * u); // cosine easing
      const h = a.height + (b.height - a.height) * w;
      out.push({ t, height: h });
    }
    out.push({ t: t1, height: b.height });
  }

  const uniq = [];
  for (const s of out) {
    if (uniq.length === 0 || uniq[uniq.length - 1].t !== s.t) uniq.push(s);
  }
  return uniq;
}