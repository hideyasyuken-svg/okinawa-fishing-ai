// src/utils/tideAdvanced.js

export function sortSeries(series = []) {
  return [...series]
    .filter((v) => v && Number.isFinite(v.t) && Number.isFinite(v.h))
    .sort((a, b) => a.t - b.t);
}

export function formatDayKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatJPDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatHM(ts) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function degToDirJa(deg) {
  if (!Number.isFinite(deg)) return "-";
  const dirs = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

export function groupSeriesByDay(series = []) {
  const sorted = sortSeries(series);
  const map = new Map();

  for (const row of sorted) {
    const key = formatDayKey(row.t);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }

  return Array.from(map.entries()).map(([key, rows]) => ({
    key,
    rows,
    dateTs: rows[0]?.t ?? Date.now(),
  }));
}

/**
 * 満潮干潮を検出
 * - 近すぎるピークは統合
 * - 小さすぎる揺れは除外
 */
export function findTideExtrema(series = [], options = {}) {
  const {
    minGapMinutes = 90,
    minSwing = 0.08,
  } = options;

  const src = sortSeries(series);
  if (src.length < 3) return [];

  const raw = [];

  for (let i = 1; i < src.length - 1; i++) {
    const a = src[i - 1];
    const b = src[i];
    const c = src[i + 1];

    const isHigh =
      (b.h >= a.h && b.h > c.h) ||
      (b.h > a.h && b.h >= c.h);

    const isLow =
      (b.h <= a.h && b.h < c.h) ||
      (b.h < a.h && b.h <= c.h);

    if (!isHigh && !isLow) continue;

    const leftDiff = Math.abs(b.h - a.h);
    const rightDiff = Math.abs(b.h - c.h);
    const swing = Math.max(leftDiff, rightDiff);

    if (swing < minSwing) continue;

    raw.push({
      t: b.t,
      h: b.h,
      type: isHigh ? "high" : "low",
      label: isHigh ? "満潮" : "干潮",
      mark: isHigh ? "▲" : "▼",
      swing,
    });
  }

  if (!raw.length) return [];

  // 近すぎるイベントは強い方を残す
  const merged = [];
  const minGapMs = minGapMinutes * 60 * 1000;

  for (const ev of raw) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(ev);
      continue;
    }

    if (ev.type === last.type && Math.abs(ev.t - last.t) < minGapMs) {
      if (ev.swing >= last.swing) merged[merged.length - 1] = ev;
    } else {
      merged.push(ev);
    }
  }

  // high / low が連続しすぎる時は弱い方を落とす
  const finalEvents = [];
  for (const ev of merged) {
    const last = finalEvents[finalEvents.length - 1];
    if (!last) {
      finalEvents.push(ev);
      continue;
    }

    if (last.type === ev.type) {
      if (ev.swing > last.swing) finalEvents[finalEvents.length - 1] = ev;
    } else {
      finalEvents.push(ev);
    }
  }

  return finalEvents;
}

export function makeBestWindows(extrema = [], beforeMin = 90, afterMin = 90) {
  return extrema.map((ev) => ({
    start: ev.t - beforeMin * 60 * 1000,
    end: ev.t + afterMin * 60 * 1000,
    label: `${ev.label}前後`,
    type: ev.type,
  }));
}

export function findNextHighTide(extrema = [], nowTs = Date.now()) {
  return extrema.find((ev) => ev.type === "high" && ev.t > nowTs) || null;
}

export function getNearestMarine(rows = [], ts) {
  if (!Array.isArray(rows) || !rows.length) return null;

  let best = null;
  let bestDiff = Infinity;

  for (const r of rows) {
    if (!Number.isFinite(r?.t)) continue;
    const diff = Math.abs(r.t - ts);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }

  return best;
}

function getSlopeAround(series = [], ts) {
  const src = sortSeries(series);
  if (src.length < 2) return 0;

  let idx = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i].t >= ts) {
      idx = i;
      break;
    }
  }

  const a = src[Math.max(0, idx - 1)];
  const b = src[Math.min(src.length - 1, idx + 1)];

  if (!a || !b || a.t === b.t) return 0;

  const dh = b.h - a.h;
  const dtHour = (b.t - a.t) / (1000 * 60 * 60);
  if (!dtHour) return 0;

  return dh / dtHour;
}

export function calcFishingAI({
  series = [],
  bestWindows = [],
  marine = null,
  nowTs = Date.now(),
}) {
  let score = 50;
  const reasons = [];

  const inBestWindow = bestWindows.some(
    (w) => nowTs >= w.start && nowTs <= w.end
  );

  if (inBestWindow) {
    score += 22;
    reasons.push("潮の変化が強い時間帯");
  }

  const slope = Math.abs(getSlopeAround(series, nowTs));
  if (slope >= 0.18) {
    score += 10;
    reasons.push("潮がよく動いている");
  } else if (slope <= 0.05) {
    score -= 8;
    reasons.push("潮の動きが弱め");
  }

  const wind = marine?.windSpeed;
  if (Number.isFinite(wind)) {
    if (wind >= 2 && wind <= 7) {
      score += 10;
      reasons.push("風が比較的安定");
    } else if (wind > 10) {
      score -= 15;
      reasons.push("風が強い");
    }
  }

  const wave = marine?.waveHeight;
  if (Number.isFinite(wave)) {
    if (wave >= 0.3 && wave <= 1.2) {
      score += 8;
      reasons.push("波が程よい");
    } else if (wave > 2.0) {
      score -= 18;
      reasons.push("波が高い");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label = "普通";
  let stars = 3;
  let comment = "様子見しながら狙える日です。";

  if (score >= 85) {
    label = "かなり良い";
    stars = 5;
    comment = "かなり期待できます。朝夕まずめは特に狙い目です。";
  } else if (score >= 70) {
    label = "良い";
    stars = 4;
    comment = "チャンスあり。潮の変化に合わせて狙うと良いです。";
  } else if (score >= 50) {
    label = "普通";
    stars = 3;
    comment = "場所選びとタイミングで十分勝負できます。";
  } else if (score >= 35) {
    label = "やや厳しい";
    stars = 2;
    comment = "無理せず風裏や足場の良い場所がおすすめです。";
  } else {
    label = "厳しい";
    stars = 1;
    comment = "安全重視。無理な釣行は避けた方がよいです。";
  }

  return { score, label, stars, comment, reasons };
}