export function WindPanel({ wind = [] }) {
  if (!wind.length) {
    return (
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>風（Open-Meteo）</h3>
        <div style={{ opacity: 0.6 }}>読み込み中…</div>
      </div>
    );
  }

  const w = wind[0];

  const timeText = w.time
    ? new Date(w.time).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  const toDeg = (w.direction + 180) % 360;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>風（Open-Meteo）</h3>

      <div>いま: {timeText}</div>
      <div>風速: {w.speed.toFixed(1)} m/s</div>
      <div>風向（FROM）: ↘ {Math.round(w.direction)}°</div>
      <div>吹き先（TO）: ↗ {Math.round(toDeg)}°</div>

      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
        ※FROM は吹いてくる方向 / TO は吹いていく方向
      </div>
    </div>
  );
}