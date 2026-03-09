import { useEffect, useMemo, useState } from "react";
import { loadJSON, saveJSON } from "../../lib/storage.js";

const SPOTS_KEY = "okw_spots_v1";
const ACTIVE_KEY = "okw_active_spot_v1";

const defaultSpots = [
  { id: "naha", name: "那覇（仮）", lat: 26.2124, lon: 127.6809, seaBearingDeg: 180 },
  { id: "chatan", name: "北谷（仮）", lat: 26.3162, lon: 127.7556, seaBearingDeg: 270 }
];

export function useSpotStore() {
  const [spots, setSpots] = useState(() => loadJSON(SPOTS_KEY, defaultSpots));
  const [activeSpotId, setActiveSpotId] = useState(() =>
    loadJSON(ACTIVE_KEY, defaultSpots[0].id)
  );

  useEffect(() => saveJSON(SPOTS_KEY, spots), [spots]);
  useEffect(() => saveJSON(ACTIVE_KEY, activeSpotId), [activeSpotId]);

  const activeSpot = useMemo(
    () => spots.find((s) => s.id === activeSpotId) || spots[0],
    [spots, activeSpotId]
  );

  function addSpot(spot) {
    const id = crypto.randomUUID();
    setSpots((prev) => [...prev, { ...spot, id }]);
    setActiveSpotId(id);
  }

  function removeSpot(id) {
    setSpots((prev) => prev.filter((s) => s.id !== id));
    setActiveSpotId((prev) => (prev === id ? (spots.find((x) => x.id !== id)?.id || "naha") : prev));
  }

  function updateSpot(id, patch) {
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return { spots, activeSpotId, activeSpot, setActiveSpotId, addSpot, removeSpot, updateSpot };
}