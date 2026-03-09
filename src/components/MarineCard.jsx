import WindArrow from "./WindArrow";

function dirToJa(deg) {
  if (!Number.isFinite(deg)) return "-";
  const dirs = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  const index = Math.round(deg / 45) % 8;
  return dirs[index];
}

function windColor(speed) {
  if (!Number.isFinite(speed)) return "#6b7280";
  if (speed < 3) return "#16a34a";
  if (speed < 6) return "#eab308";
  return "#dc2626";
}

export default function MarineCard({ marine }) {
  if (!marine) return null;

  const windTextColor = windColor(marine.windSpeed);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        海況
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>風速</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: windTextColor }}>
            {marine.windSpeed} m/s
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>風向</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            <WindArrow fromDeg={marine.windDir} />
            <span>{dirToJa(marine.windDir)}</span>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>波高</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{marine.waveHeight} m</div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>波周期</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>
            {marine.wavePeriod ?? "-"} s
          </div>
        </div>
      </div>
    </div>
  );
}