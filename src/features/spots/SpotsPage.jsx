import { useMemo, useState } from "react";
import { useSpotStore } from "./spotStore.js";

function clampDeg(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const x = ((n % 360) + 360) % 360;
  return x;
}

export function SpotsPage() {
  const { spots, addSpot, removeSpot, updateSpot, activeSpotId, setActiveSpotId } = useSpotStore();

  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [sea, setSea] = useState("");

  const canAdd = useMemo(() => {
    const la = Number(lat);
    const lo = Number(lon);
    const se = clampDeg(sea);
    return (
      name.trim().length > 0 &&
      Number.isFinite(la) &&
      Number.isFinite(lo) &&
      la >= -90 && la <= 90 &&
      lo >= -180 && lo <= 180 &&
      se != null
    );
  }, [name, lat, lon, sea]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>釣り場管理</h2>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ margin: "0 0 8px 0" }}>新しい釣り場を追加</h3>

        <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <input placeholder="名前" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="緯度 (例: 26.2124)" value={lat} onChange={(e) => setLat(e.target.value)} />
          <input placeholder="経度 (例: 127.6809)" value={lon} onChange={(e) => setLon(e.target.value)} />
          <input placeholder="海の方向（度）例: 180" value={sea} onChange={(e) => setSea(e.target.value)} />

          <div style={{ fontSize: 12, opacity: 0.8 }}>
            海方向（度）は「海がある方向」です（例：南に海→180 / 西に海→270）
          </div>

          <button
            disabled={!canAdd}
            onClick={() => {
              if (!canAdd) return;
              addSpot({
                name: name.trim(),
                lat: Number(lat),
                lon: Number(lon),
                seaBearingDeg: clampDeg(sea),
              });
              setName("");
              setLat("");
              setLon("");
              setSea("");
            }}
          >
            追加
          </button>

          {!canAdd && (
            <div style={{ color: "#c33", fontSize: 12 }}>
              入力を確認：緯度/経度は数値、海方向は 0〜360 の数値で入れてください
            </div>
          )}
        </div>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>登録済み</h3>

        {spots.map((s) => (
          <div
            key={s.id}
            style={{
              border: "1px solid #eee",
              padding: 10,
              borderRadius: 8,
              background: s.id === activeSpotId ? "#f0f8ff" : "#fff",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 16 }}>{s.name}</strong>
              <span style={{ opacity: 0.85 }}>
                緯度 {s.lat} / 経度 {s.lon} / 海方向 {s.seaBearingDeg ?? "未設定"}°
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setActiveSpotId(s.id)} disabled={s.id === activeSpotId}>
                {s.id === activeSpotId ? "選択中" : "この釣り場にする"}
              </button>
              <button onClick={() => removeSpot(s.id)}>削除</button>
            </div>

            <div style={{ display: "grid", gap: 6, maxWidth: 520 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>海方向（度）を編集</span>
                <input
                  value={String(s.seaBearingDeg ?? "")}
                  placeholder="例: 180"
                  onChange={(e) => {
                    const v = e.target.value;
                    const deg = v.trim() === "" ? null : clampDeg(v);
                    updateSpot(s.id, { seaBearingDeg: deg });
                  }}
                />
              </label>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                目安：南=180 / 西=270 / 北=0 / 東=90
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}