export function SpotSelector({ spots, activeSpotId, onChange }) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span>釣り場</span>
      <select value={activeSpotId} onChange={(e) => onChange(e.target.value)}>
        {spots.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}