// src/lib/favorites.js
const KEY = "okf_favorites_v1";

export function loadFavorites() {
  try {
    const s = localStorage.getItem(KEY);
    const arr = s ? JSON.parse(s) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveFavorites(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addFavorite(spot) {
  const list = loadFavorites();
  const id = spot.id ?? `${spot.lat.toFixed(5)},${spot.lng.toFixed(5)}`;
  if (list.some((x) => x.id === id)) return list;
  const next = [{ ...spot, id }, ...list].slice(0, 50);
  saveFavorites(next);
  return next;
}

export function removeFavorite(id) {
  const list = loadFavorites();
  const next = list.filter((x) => x.id !== id);
  saveFavorites(next);
  return next;
}