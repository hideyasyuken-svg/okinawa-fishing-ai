const FAVORITES_KEY = 'okinawa_fishing_favorites_v1'

export function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('getFavorites error:', e)
    return []
  }
}

export function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  } catch (e) {
    console.error('saveFavorites error:', e)
  }
}

export function isFavorite(favorites, spotId) {
  return favorites.some((item) => item.id === spotId)
}

export function toggleFavorite(favorites, spot) {
  if (!spot || !spot.id) return favorites

  const exists = favorites.some((item) => item.id === spot.id)

  if (exists) {
    return favorites.filter((item) => item.id !== spot.id)
  }

  return [
    ...favorites,
    {
      id: spot.id,
      name: spot.name || '',
      area: spot.area || '',
      lat: spot.lat ?? null,
      lng: spot.lng ?? null,
      fish: Array.isArray(spot.fish) ? spot.fish : [],
    },
  ]
}