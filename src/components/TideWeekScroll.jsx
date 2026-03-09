import React, { useEffect, useMemo, useRef, useState } from "react";

const pad2 = (n) => String(n).padStart(2, "0");
const hm = (ms) => {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const ymd = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const md = (ms) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function stars(score) {
  if (score >= 81) return 5;
  if (score >= 61) return 4;
  if (score >= 41) return 3;
  if (score >= 21) return 2;
  return 1;
}

function starText(n) {
  return "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);
}

export default function TideWeekScroll({ rawTide, windMs, waveM }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);

  const [nowMs, setNowMs] = useState(Date.now());
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const points = useMemo(() => {
    const src = Array.isArray(rawTide) ? rawTide : [];

    const arr = src
      .map((p) => {
        const tRaw = p?.t ?? p?.time ?? p?.dt ?? p?.timestamp;
        const hRaw = p?.h ?? p?.heightCm ?? p?.height ?? p?.value ?? p?.v;

        const t =
          typeof tRaw === "number"
            ? tRaw > 1e12
              ? tRaw
              : tRaw * 1000
            : new Date(tRaw).getTime();

        const hNum = Number(hRaw);
        if (!Number.isFinite(t) || !Number.isFinite(hNum)) return null;

        const h = hNum > 20 ? hNum : hNum * 100;
        return { t, h };
      })
      .filter(Boolean)
      .sort((a, b) => a.t - b.t);

    const cleaned = [];
    const MIN_STEP = 10 * 60 * 1000;
    const MAX_JUMP = 160;

    for (const p of arr) {
      if (!cleaned.length) {
        cleaned.push(p);
        continue;
      }

      const prev = cleaned[cleaned.length - 1];

      if (p.t - prev.t < MIN_STEP) continue;
      if (Math.abs(p.h - prev.h) > MAX_JUMP) continue;

      cleaned.push(p);
    }

    return cleaned;
  }, [rawTide]);

  const range = useMemo(() => {
    if (!points.length) return null;

    const tMin = points[0].t;
    const tMax = points[points.length - 1].t;

    let hMin = Infinity;
    let hMax = -Infinity;

    for (const p of points) {
      if (p.h < hMin) hMin = p.h;
      if (p.h > hMax) hMax = p.h;
    }

    const pad = (hMax - hMin) * 0.08 || 20;
    return { tMin, tMax, hMin: hMin - pad, hMax: hMax + pad };
  }, [points]);

  const W = 1400;
  const H = 220;
  const padL = 38;
  const padR = 18;
  const padT = 26;
  const padB = 26;

  const xOf = (t) => {
    if (!range) return padL;
    return padL + ((t - range.tMin) / (range.tMax - range.tMin)) * (W - padL - padR);
  };

  const tOf = (x) => {
    if (!range) return nowMs;
    const p = (x - padL) / (W - padL - padR);
    return range.tMin + clamp(p, 0, 1) * (range.tMax - range.tMin);
  };

  const yOf = (h) => {
    if (!range) return H - padB;
    return padT + ((range.hMax - h) / (range.hMax - range.hMin)) * (H - padT - padB);
  };

  const extrema = useMemo(() => {
    if (points.length < 5) return [];
    const out = [];
    const MIN_GAP_MS = 25 * 60 * 1000;

    for (let i = 2; i < points.length - 2; i++) {
      const a = points[i - 1].h;
      const b = points[i].h;
      const c = points[i + 1].h;

      const isHigh = b >= a && b >= c && (b > a || b > c);
      const isLow = b <= a && b <= c && (b < a || b < c);

      if (!isHigh && !isLow) continue;

      const t = points[i].t;

      if (out.length) {
        const last = out[out.length - 1];
        if (Math.abs(t - last.t) < MIN_GAP_MS) {
          if (isHigh && b > last.h) out[out.length - 1] = { t, h: b, type: "high" };
          if (isLow && b < last.h) out[out.length - 1] = { t, h: b, type: "low" };
          continue;
        }
      }

      out.push({ t, h: b, type: isHigh ? "high" : "low" });
    }
    return out;
  }, [points]);

  const fishBoostBands = useMemo(() => {
    const highs = extrema.filter((e) => e.type === "high");
    const bandMs = 90 * 60 * 1000;
    return highs.map((h) => ({ from: h.t - bandMs, to: h.t + bandMs, peak: h.t }));
  }, [extrema]);

  const dayBands = useMemo(() => {
    if (!range) return [];
    const out = [];
    const start = new Date(range.tMin);
    const end = new Date(range.tMax);

    for (
      let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      d.getTime() <= end.getTime();
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    ) {
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0, 0).getTime();
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0, 0).getTime();

      const a = clamp(from, range.tMin, range.tMax);
      const b = clamp(to, range.tMin, range.tMax);
      if (b > a) out.push({ from: a, to: b, key: ymd(d.getTime()) });
    }
    return out;
  }, [range]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !range) return;

    const d = new Date();
    const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).getTime();
    const targetT = clamp(noon, range.tMin, range.tMax);
    const targetX = xOf(targetT);

    const center = targetX - el.clientWidth / 2;
    el.scrollLeft = clamp(center, 0, W);
  }, [range]);

  const pathD = useMemo(() => {
    if (!points.length || !range) return "";
    let d = "";
    for (let i = 0; i < points.length; i++) {
      const x = xOf(points[i].t);
      const y = yOf(points[i].h);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }, [points, range]);

  const areaD = useMemo(() => {
    if (!pathD || !range) return "";
    const y0 = yOf(range.hMin);
    return `${pathD} L ${xOf(range.tMax)} ${y0} L ${xOf(range.tMin)} ${y0} Z`;
  }, [pathD, range]);

  const nowX = range ? xOf(clamp(nowMs, range.tMin, range.tMax)) : padL;

  const calcFishingScore = (tMs) => {
    let score = 20;

    const band = 90 * 60 * 1000;
    let best = 0;
    for (const b of fishBoostBands) {
      const d = Math.abs(tMs - b.peak);
      if (d <= band) {
        const add = 40 * (1 - d / band);
        if (add > best) best = add;
      }
    }
    score += best;

    const h = new Date(tMs).getHours();
    const isNight = h >= 18 || h < 6;
    if (isNight) score += 20;

    if (Number.isFinite(windMs)) {
      if (windMs <= 3) score += 20;
      else if (windMs <= 6) score += 12;
      else if (windMs <= 9) score += 5;
    }

    if (Number.isFinite(waveM)) {
      if (waveM <= 0.5) score += 20;
      else if (waveM <= 1.0) score += 12;
      else if (waveM <= 1.5) score += 5;
    }

    return Math.round(clamp(score, 0, 100));
  };

  const nowScore = useMemo(() => calcFishingScore(nowMs), [nowMs, windMs, waveM, fishBoostBands]);

  const findNearestPoint = (tMs) => {
    if (!points.length) return null;

    let best = points[0];
    let bestD = Math.abs(points[0].t - tMs);
    for (let i = 1; i < points.length; i++) {
      const d = Math.abs(points[i].t - tMs);
      if (d < bestD) {
        bestD = d;
        best = points[i];
      }
    }
    return best;
  };

  const onSvgClick = (e) => {
    if (!range || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const t = tOf(x);
    const p = findNearestPoint(t);
    if (!p) return;

    const px = xOf(p.t);
    const py = yOf(p.h);
    const s = calcFishingScore(p.t);

    if (picked && Math.abs(picked.t - p.t) < 60 * 1000) {
      setPicked(null);
      return;
    }

    setPicked({ t: p.t, h: p.h, score: s, x: px, y: py });
  };

  if (!points.length) {
    return (
      <div style={{ padding: 10, fontSize: 12, opacity: 0.75 }}>
        潮位データがありません（rawTide が空 or 形式未対応）
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "white",
      }}
    >
      <svg
        ref={svgRef}
        width={W}
        height={H}
        style={{ display: "block", cursor: "pointer" }}
        onClick={onSvgClick}
      >
        <rect x="0" y="0" width={W} height={H} fill="white" />

        {dayBands.map((b) => {
          const x = xOf(b.from);
          const w = xOf(b.to) - x;
          return (
            <rect
              key={b.key}
              x={x}
              y={padT}
              width={w}
              height={H - padT - padB}
              fill="rgba(255, 210, 0, 0.12)"
            />
          );
        })}

        {fishBoostBands.map((b, i) => {
          const from = clamp(b.from, range.tMin, range.tMax);
          const to = clamp(b.to, range.tMin, range.tMax);
          if (to <= from) return null;
          const x = xOf(from);
          const w = xOf(to) - x;
          return (
            <rect
              key={i}
              x={x}
              y={padT}
              width={w}
              height={H - padT - padB}
              fill="rgba(0, 200, 0, 0.10)"
            />
          );
        })}

        {(() => {
          const lines = 4;
          const out = [];
          for (let i = 0; i <= lines; i++) {
            const y = padT + (i / lines) * (H - padT - padB);
            out.push(
              <line
                key={i}
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="rgba(0,0,0,0.06)"
              />
            );
          }
          return out;
        })()}

        <path d={areaD} fill="rgba(0,0,0,0.05)" />
        <path d={pathD} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth="2" />

        <line
          x1={nowX}
          y1={padT}
          x2={nowX}
          y2={H - padB}
          stroke="rgba(220,0,0,0.95)"
          strokeWidth="2"
        />

        <g>
          <rect
            x={clamp(nowX - 26, 0, W - 52)}
            y={4}
            width={52}
            height={18}
            rx={8}
            fill="rgba(220,0,0,0.10)"
            stroke="rgba(220,0,0,0.35)"
          />
          <text
            x={clamp(nowX, 26, W - 26)}
            y={18}
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fill="rgba(220,0,0,0.95)"
          >
            {hm(nowMs)}
          </text>
        </g>

        {extrema.map((e, i) => {
          const x = xOf(e.t);
          const y = yOf(e.h);
          const isHigh = e.type === "high";
          const mark = isHigh ? "▲" : "▼";
          const dy = isHigh ? -10 : 14;

          return (
            <g key={i}>
              <text
                x={x}
                y={y + dy}
                textAnchor="middle"
                fontSize="14"
                fontWeight="900"
                fill={isHigh ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.70)"}
              >
                {mark}
              </text>
              <text
                x={x}
                y={y + (isHigh ? -20 : 28)}
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill="rgba(0,0,0,0.60)"
              >
                {hm(e.t)}
              </text>
            </g>
          );
        })}

        {(() => {
          if (!range) return null;
          const out = [];
          const start = new Date(range.tMin);
          const end = new Date(range.tMax);

          for (
            let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            d.getTime() <= end.getTime();
            d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
          ) {
            const t = d.getTime();
            const x = xOf(clamp(t, range.tMin, range.tMax));
            out.push(
              <line
                key={`tick-${t}`}
                x1={x}
                y1={H - padB}
                x2={x}
                y2={H - padB + 6}
                stroke="rgba(0,0,0,0.25)"
              />
            );
            out.push(
              <text
                key={`lab-${t}`}
                x={x}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill="rgba(0,0,0,0.55)"
              >
                {md(t)}
              </text>
            );
          }
          return out;
        })()}

        <text x={8} y={padT + 10} fontSize="10" fontWeight="800" fill="rgba(0,0,0,0.55)">
          cm
        </text>

        {picked && (
          <g>
            <circle cx={picked.x} cy={picked.y} r={4} fill="rgba(0,0,0,0.85)" />
            {(() => {
              const boxW = 170;
              const boxH = 64;
              const x = clamp(picked.x + 10, 6, W - boxW - 6);
              const y = clamp(picked.y - boxH - 10, 6, H - boxH - 6);

              const st = stars(picked.score);

              return (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={boxW}
                    height={boxH}
                    rx={10}
                    fill="rgba(255,255,255,0.96)"
                    stroke="rgba(0,0,0,0.18)"
                  />
                  <text x={x + 10} y={y + 18} fontSize="12" fontWeight="900" fill="rgba(0,0,0,0.85)">
                    {ymd(picked.t)} {hm(picked.t)}
                  </text>
                  <text x={x + 10} y={y + 36} fontSize="12" fontWeight="800" fill="rgba(0,0,0,0.75)">
                    潮位 {Math.round(picked.h)} cm
                  </text>
                  <text x={x + 10} y={y + 54} fontSize="12" fontWeight="900" fill="rgba(0,0,0,0.85)">
                    釣り指数 {picked.score} / 100 {starText(st)}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 8,
          fontSize: 12,
          opacity: 0.9,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: "rgba(255, 210, 0, 0.20)",
              border: "1px solid rgba(0,0,0,0.10)",
            }}
          />
          日中
        </span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: "rgba(0, 200, 0, 0.16)",
              border: "1px solid rgba(0,0,0,0.10)",
            }}
          />
          釣り指数UP（満潮±90分）
        </span>

        <span style={{ marginLeft: "auto", fontWeight: 900 }}>
          現在の釣り指数：{nowScore} / 100 {starText(stars(nowScore))}
          <span style={{ fontWeight: 700, opacity: 0.7 }}>（タップで詳細）</span>
        </span>
      </div>
    </div>
  );
}