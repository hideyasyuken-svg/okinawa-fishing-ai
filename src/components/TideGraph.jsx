// src/components/TideGraph.jsx
import React, { useMemo } from "react";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function toMs(d) {
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function formatHM(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// series: [{ time: Date|string, heightCm: number }]
export default function TideGraph({
  series,
  sunrise,
  sunset,
  now = new Date(), // ★追加：現在時刻
  width = 360,
  height = 220,
  padding = 22,
  unit = "cm",
  showNowLine = true, // ★追加：赤線ON/OFF
}) {
  const sunriseMs = toMs(sunrise);
  const sunsetMs = toMs(sunset);
  const nowMs = toMs(now);

  const { points, yMin, yMax, startMs, endMs, xs, ys } = useMemo(() => {
    if (!Array.isArray(series) || series.length < 2) {
      return { points: "", yMin: 0, yMax: 1, startMs: NaN, endMs: NaN, xs: [], ys: [] };
    }

    const _xs = series.map((p) => toMs(p.time));
    const _ys = series.map((p) => Number(p.heightCm));

    const finiteXs = _xs.filter(Number.isFinite);
    const sMs = Math.min(...finiteXs);
    const eMs = Math.max(...finiteXs);

    let minY = Math.min(..._ys.filter(Number.isFinite));
    let maxY = Math.max(..._ys.filter(Number.isFinite));
    if (!Number.isFinite(minY) || !Number.isFinite(maxY) || minY === maxY) {
      minY = 0;
      maxY = 1;
    }

    const pad = (maxY - minY) * 0.15;
    minY -= pad;
    maxY += pad;

    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    const toX = (ms) => {
      const t = (ms - sMs) / (eMs - sMs);
      return padding + clamp(t, 0, 1) * innerW;
    };
    const toY = (val) => {
      const t = (val - minY) / (maxY - minY);
      return padding + (1 - clamp(t, 0, 1)) * innerH;
    };

    const pts = series
      .map((p) => {
        const x = toX(toMs(p.time));
        const y = toY(Number(p.heightCm));
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    return { points: pts, yMin: minY, yMax: maxY, startMs: sMs, endMs: eMs, xs: _xs, ys: _ys };
  }, [series, width, height, padding]);

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const dayRect = useMemo(() => {
    if (!Number.isFinite(sunriseMs) || !Number.isFinite(sunsetMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return null;
    }
    const s = clamp((sunriseMs - startMs) / (endMs - startMs), 0, 1);
    const e = clamp((sunsetMs - startMs) / (endMs - startMs), 0, 1);
    const x = padding + innerW * Math.min(s, e);
    const w = innerW * Math.abs(e - s);
    return { x, w };
  }, [sunriseMs, sunsetMs, startMs, endMs, padding, innerW]);

  const yTicks = useMemo(() => {
    const a = yMin;
    const b = yMax;
    const mid = (a + b) / 2;
    return [b, mid, a].map((v) => ({
      v,
      y: padding + (1 - clamp((v - a) / (b - a), 0, 1)) * innerH,
    }));
  }, [yMin, yMax, padding, innerH]);

  // ★現在位置（赤線＋赤丸）を計算
  const nowMarker = useMemo(() => {
    if (!showNowLine) return null;
    if (!Number.isFinite(nowMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
    if (!Array.isArray(xs) || xs.length < 2) return null;

    // グラフの範囲外なら表示しない（好みで clamp に変えてもOK）
    if (nowMs < startMs || nowMs > endMs) return null;

    const t = (nowMs - startMs) / (endMs - startMs);
    const x = padding + clamp(t, 0, 1) * innerW;

    // series から nowMs の前後を探して線形補間（赤丸のy）
    let i = 0;
    while (i < xs.length - 1 && xs[i + 1] < nowMs) i++;

    const x0 = xs[i];
    const x1 = xs[i + 1];
    const y0 = ys[i];
    const y1 = ys[i + 1];

    if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)) return { x, y: null };

    const u = x1 === x0 ? 0 : clamp((nowMs - x0) / (x1 - x0), 0, 1);
    const yVal = y0 + (y1 - y0) * u;

    const yy = padding + (1 - clamp((yVal - yMin) / (yMax - yMin), 0, 1)) * innerH;

    return { x, y: yy, label: formatHM(now) };
  }, [showNowLine, nowMs, startMs, endMs, xs, ys, padding, innerW, innerH, yMin, yMax, now]);

  return (
    <svg width={width} height={height} style={{ display: "block", width: "100%" }}>
      {/* 背景 */}
      <rect x={0} y={0} width={width} height={height} rx={12} fill="rgba(0,0,0,0.06)" />

      {/* 日中の明るい帯 */}
      {dayRect ? <rect x={dayRect.x} y={padding} width={dayRect.w} height={innerH} rx={10} fill="rgba(255,255,255,0.85)" /> : null}

      {/* 枠 */}
      <rect x={padding} y={padding} width={innerW} height={innerH} rx={10} fill="transparent" stroke="rgba(0,0,0,0.12)" />

      {/* Yガイド */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padding} y1={t.y} x2={padding + innerW} y2={t.y} stroke="rgba(0,0,0,0.10)" />
          <text x={6} y={t.y + 4} fontSize="11" fill="rgba(0,0,0,0.55)">
            {Math.round(t.v)}
            {unit}
          </text>
        </g>
      ))}

      {/* 波形 */}
      {points ? (
        <>
          <polygon points={`${points} ${padding + innerW},${padding + innerH} ${padding},${padding + innerH}`} fill="rgba(99, 102, 241, 0.25)" />
          <polyline points={points} fill="none" stroke="rgba(99, 102, 241, 0.9)" strokeWidth="2.5" />
        </>
      ) : null}

      {/* 日の出/日の入 */}
      {Number.isFinite(sunriseMs) && Number.isFinite(startMs) && Number.isFinite(endMs) ? (
        <text
          x={padding + innerW * clamp((sunriseMs - startMs) / (endMs - startMs), 0, 1)}
          y={padding - 6}
          fontSize="11"
          textAnchor="middle"
          fill="rgba(0,0,0,0.6)"
        >
          日の出 {formatHM(sunrise)}
        </text>
      ) : null}

      {Number.isFinite(sunsetMs) && Number.isFinite(startMs) && Number.isFinite(endMs) ? (
        <text
          x={padding + innerW * clamp((sunsetMs - startMs) / (endMs - startMs), 0, 1)}
          y={padding - 6}
          fontSize="11"
          textAnchor="middle"
          fill="rgba(0,0,0,0.6)"
        >
          日の入 {formatHM(sunset)}
        </text>
      ) : null}

      {/* ★現在時刻：赤線＋赤丸 */}
      {nowMarker ? (
        <>
          <line
            x1={nowMarker.x}
            y1={padding}
            x2={nowMarker.x}
            y2={padding + innerH}
            stroke="rgba(220,0,0,0.85)"
            strokeWidth="3"
          />
          {Number.isFinite(nowMarker.y) ? (
            <>
              <circle cx={nowMarker.x} cy={nowMarker.y} r="6" fill="rgba(220,0,0,1)" />
              <circle cx={nowMarker.x} cy={nowMarker.y} r="10" fill="rgba(220,0,0,0.15)" />
            </>
          ) : null}
          <text x={nowMarker.x} y={padding + innerH + 16} fontSize="11" textAnchor="middle" fill="rgba(220,0,0,0.85)">
            {nowMarker.label}
          </text>
        </>
      ) : null}
    </svg>
  );
}