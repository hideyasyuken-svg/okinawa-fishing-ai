const hhmm = (t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function RecommendPanel({ items }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>おすすめ時間 TOP</h3>

      {!items?.length ? (
        <div style={{ opacity: 0.8 }}>おすすめ計算できません（データ不足）</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((x, i) => (
            <div key={i} style={{ display: "grid", gap: 2, padding: 8, border: "1px solid #eee", borderRadius: 8 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <b>{i + 1}. {x.title}</b>
                <span>{hhmm(x.start)} - {hhmm(x.end)}</span>
                <span>Score: {Math.round(x.score * 100)}</span>
              </div>
              <div style={{ opacity: 0.85 }}>{x.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}