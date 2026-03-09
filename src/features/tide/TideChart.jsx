import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

const toHHMM = (t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function clampBandTo(samples, b) {
  if (!samples.length) return null;
  const minT = samples[0].t;
  const maxT = samples[samples.length - 1].t;
  const start = Math.max(minT, b.start);
  const end = Math.min(maxT, b.end);
  if (end <= start) return null;
  return { ...b, start, end };
}

export function TideChart({ samples, bands, extremes }) {
  const data = samples.map((s) => ({ t: s.t, height: s.height }));

  const clippedBands = bands
    .map((b) => clampBandTo(samples, b))
    .filter(Boolean);

  return (
    <div style={{ width: "100%", height: 340, border: "1px solid #ddd", borderRadius: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 12, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => toHHMM(Number(v))}
            tick={{ fontSize: 12 }}
          />
          <YAxis dataKey="height" width={48} tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
          <Tooltip
            labelFormatter={(v) => `時刻: ${toHHMM(Number(v))}`}
            formatter={(value) => [`${Number(value).toFixed(2)} m`, "潮位"]}
          />

          {clippedBands.map((b, i) => (
            <ReferenceArea
              key={`${b.kind}-${i}-${b.start}`}
              x1={b.start}
              x2={b.end}
              ifOverflow="hidden"
              fillOpacity={0.12}
              label={{ value: b.label, position: "insideTopLeft", fontSize: 12 }}
            />
          ))}

          {extremes.map((e, i) => (
            <ReferenceLine
              key={`${e.type ?? "X"}-${i}-${e.tMs}`}
              x={e.tMs}
              ifOverflow="hidden"
              strokeDasharray="4 4"
              label={{
                value: e.type === "High" ? "満" : e.type === "Low" ? "干" : "",
                position: "top",
                fontSize: 12,
              }}
            />
          ))}

          <Area type="monotone" dataKey="height" strokeWidth={2} fillOpacity={0.18} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}