import React, { useMemo } from "react";
import {
  findTideExtrema,
  formatHM,
  makeBestWindows,
  sortSeries,
} from "../utils/tideAdvanced";

export default function TideChart({
  series = [],
  nowTs = Date.now(),
  width = 900,
  height = 300,
  small = false,
  showNowLine = true,
  showExtrema = true,
  showBestWindows = true,
  bestWindows = null,
}) {
  const data = useMemo(() => sortSeries(series), [series]);

  const events = useMemo(() => findTideExtrema(data), [data]);

  const windows = useMemo(() => {
    if (Array.isArray(bestWindows) && bestWindows.length) return bestWindows;
    return makeBestWindows(events, 90, 90);
  }, [bestWindows, events]);

  if (!data.length) {
    return (
      <div
        style={{
          height,
          display: "grid",
          placeItems: "center",
          color: "#94a3b8",
          border: "1px solid rgba(148,163,184,0.2)",
          borderRadius: 16,
        }}
      >
        潮データなし
      </div>
    );
  }

  const pad = small
    ? { top: 12, right: 10, bottom: 20, left: 28 }
    : { top: 18, right: 16, bottom: 30, left: 38 };

  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const minT = data[0].t;
  const maxT = data[data.length - 1].t;
  const minHRaw = Math.min(...data.map((d) => d.h));
  const maxHRaw = Math.max(...data.map((d) => d.h));

  const rangeH = Math.max(0.5, maxHRaw - minHRaw);
  const minH = minHRaw - rangeH * 0.08;
  const maxH = maxHRaw + rangeH * 0.08;

  const xOf = (t) =>
    pad.left + ((t - minT) / Math.max(1, maxT - minT)) * plotW;

  const yOf = (h) =>
    pad.top + ((maxH - h) / Math.max(0.0001, maxH - minH)) * plotH;

  const pts = data.map((d) => ({ x: xOf(d.t), y: yOf(d.h), ...d }));

  const dLine = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const yTicks = small ? 3 : 4;
  const tickValues = Array.from({ length: yTicks + 1 }).map((_, i) => {
    return minH + ((maxH - minH) * i) / yTicks;
  });

  const hourMarks = [];
  const stepMs = small ? 12 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;

  let cursor = Math.ceil(minT / stepMs) * stepMs;
  while (cursor <= maxT) {
    hourMarks.push(cursor);
    cursor += stepMs;
  }

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          height,
          display: "block",
          background: "rgba(15,23,42,0.35)",
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.18)",
        }}
      >
        {showBestWindows &&
          windows.map((w, i) => {
            const sx = xOf(Math.max(minT, w.start));
            const ex = xOf(Math.min(maxT, w.end));
            const ww = Math.max(0, ex - sx);
            if (ww <= 0) return null;
            return (
              <rect
                key={`bw-${i}`}
                x={sx}
                y={pad.top}
                width={ww}
                height={plotH}
                rx="8"
                fill="rgba(34,197,94,0.16)"
              />
            );
          })}

        {tickValues.map((v, i) => {
          const y = yOf(v);
          return (
            <g key={`yt-${i}`}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.15)"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={small ? 9 : 11}
                fill="rgba(226,232,240,0.8)"
              >
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}

        {hourMarks.map((t, i) => {
          const x = xOf(t);
          const d = new Date(t);
          const label = `${String(d.getHours()).padStart(2, "0")}:00`;
          return (
            <g key={`xt-${i}`}>
              <line
                x1={x}
                x2={x}
                y1={pad.top}
                y2={height - pad.bottom}
                stroke="rgba(148,163,184,0.10)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                fontSize={small ? 9 : 11}
                fill="rgba(226,232,240,0.8)"
              >
                {label}
              </text>
            </g>
          );
        })}

        <path
          d={dLine}
          fill="none"
          stroke="rgba(56,189,248,1)"
          strokeWidth={small ? 2 : 3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {showNowLine && nowTs >= minT && nowTs <= maxT && (
          <>
            <line
              x1={xOf(nowTs)}
              x2={xOf(nowTs)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="rgba(239,68,68,0.95)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {!small && (
              <text
                x={xOf(nowTs)}
                y={pad.top - 2 + 12}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(254,202,202,1)"
              >
                現在
              </text>
            )}
          </>
        )}

        {showExtrema &&
          events.map((ev, i) => {
            const x = xOf(ev.t);
            const y = yOf(ev.h);
            const isHigh = ev.type === "high";

            return (
              <g key={`ev-${i}`}>
                <text
                  x={x}
                  y={isHigh ? y - 10 : y + 18}
                  textAnchor="middle"
                  fontSize={small ? 11 : 14}
                  fill={isHigh ? "rgba(251,191,36,1)" : "rgba(167,139,250,1)"}
                >
                  {ev.mark}
                </text>

                {!small && (
                  <>
                    <text
                      x={x}
                      y={isHigh ? y - 24 : y + 32}
                      textAnchor="middle"
                      fontSize="10"
                      fill="rgba(226,232,240,0.95)"
                    >
                      {ev.label}
                    </text>
                    <text
                      x={x}
                      y={isHigh ? y - 36 : y + 44}
                      textAnchor="middle"
                      fontSize="10"
                      fill="rgba(148,163,184,0.95)"
                    >
                      {formatHM(ev.t)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}