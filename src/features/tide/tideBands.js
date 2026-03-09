import SunCalc from "suncalc";

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export function buildExtremeWindowBands(extremes) {
  const minutes = 90;
  return extremes.map((e) => ({
    start: e.tMs - minutes * 60000,
    end: e.tMs + minutes * 60000,
    label: e.type === "High" ? "満潮前後" : e.type === "Low" ? "干潮前後" : "潮位転換前後",
    score: 0.7,
    kind: "EXTREME_WINDOW",
  }));
}

export function buildTideMovementBands(samples) {
  if (samples.length < 3) return [];

  const dtMin = (samples[1].t - samples[0].t) / 60000;
  if (!Number.isFinite(dtMin) || dtMin <= 0) return [];

  const slopeThreshold = 0.002; // m/min
  const minBandMs = 30 * 60000;

  const bands = [];
  let start = null;
  let acc = 0;
  let n = 0;

  for (let i = 1; i < samples.length; i++) {
    const dy = samples[i].height - samples[i - 1].height;
    const slope = Math.abs(dy / dtMin);
    const good = slope >= slopeThreshold;
    const s = clamp01((slope - slopeThreshold) / slopeThreshold);

    if (good) {
      if (start == null) start = samples[i - 1].t;
      acc += s;
      n += 1;
    } else if (start != null) {
      const end = samples[i - 1].t;
      if (end - start >= minBandMs) {
        bands.push({
          start,
          end,
          label: "潮が動く",
          score: clamp01(n ? acc / n : 0.5),
          kind: "MOVING",
        });
      }
      start = null;
      acc = 0;
      n = 0;
    }
  }

  if (start != null) {
    const end = samples[samples.length - 1].t;
    if (end - start >= minBandMs) {
      bands.push({
        start,
        end,
        label: "潮が動く",
        score: clamp01(n ? acc / n : 0.5),
        kind: "MOVING",
      });
    }
  }

  return bands;
}

export function buildMazumeBands({ date, lat, lon }) {
  const times = SunCalc.getTimes(date, lat, lon);
  const minutes = 60;

  const bands = [];
  if (times.sunrise instanceof Date) {
    const t = times.sunrise.getTime();
    bands.push({ start: t - minutes * 60000, end: t + minutes * 60000, label: "朝マズメ", score: 0.75, kind: "MAZUME" });
  }
  if (times.sunset instanceof Date) {
    const t = times.sunset.getTime();
    bands.push({ start: t - minutes * 60000, end: t + minutes * 60000, label: "夕マズメ", score: 0.75, kind: "MAZUME" });
  }
  return bands;
}