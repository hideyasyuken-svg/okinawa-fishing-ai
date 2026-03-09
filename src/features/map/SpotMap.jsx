import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Viteでマーカーが表示されない問題の対策（超定番）
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

function fixLeafletIconsOnce() {
  // 既に設定済みなら何もしない
  if (L.Icon.Default.prototype._getIconUrlFixed) return;
  L.Icon.Default.prototype._getIconUrlFixed = true;

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

function FitToSpots({ spots }) {
  const map = useMap();

  useEffect(() => {
    if (!spots?.length) return;
    const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lon]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, spots]);

  return null;
}

export function SpotMap({ spots, activeSpotId, onSelectSpotId, height = 260 }) {
  fixLeafletIconsOnce();

  const active = useMemo(
    () => spots.find((s) => s.id === activeSpotId) || spots[0],
    [spots, activeSpotId]
  );

  // 初期中心（アクティブ or 最初）
  const center = active ? [active.lat, active.lon] : [26.2124, 127.6809];

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: 10, borderBottom: "1px solid #eee" }}>
        <b>地図</b>（釣り場をクリックで選択）
      </div>

      <div style={{ height }}>
        <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
          {/* OSMタイル */}
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitToSpots spots={spots} />

          {spots.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lon]}
              eventHandlers={{
                click: () => onSelectSpotId(s.id),
              }}
            >
              <Popup>
                <div style={{ display: "grid", gap: 6 }}>
                  <b>{s.name}</b>
                  <div>
                    {s.lat.toFixed(4)}, {s.lon.toFixed(4)}
                  </div>
                  <div>海方向: {s.seaBearingDeg ?? "未設定"}°</div>
                  <button
                    onClick={() => onSelectSpotId(s.id)}
                    disabled={s.id === activeSpotId}
                  >
                    {s.id === activeSpotId ? "選択中" : "この釣り場にする"}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}