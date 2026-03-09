import { useEffect, useMemo, useState } from 'react'
import {
  getFavorites,
  saveFavorites,
  isFavorite,
  toggleFavorite,
} from '../utils/favorites'

export default function FavoriteSpotSection({
  spots = [],
  selectedSpot = null,
  onSelectSpot = () => {},
}) {
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  function handleToggleFavorite(spot) {
    const next = toggleFavorite(favorites, spot)
    setFavorites(next)
    saveFavorites(next)
  }

  const favoriteIds = useMemo(() => {
    return new Set(favorites.map((item) => item.id))
  }, [favorites])

  const favoriteSpots = useMemo(() => {
    const map = new Map(spots.map((s) => [s.id, s]))
    return favorites.map((fav) => map.get(fav.id) || fav)
  }, [favorites, spots])

  return (
    <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          お気に入り釣り場
        </div>

        {favoriteSpots.length === 0 ? (
          <div style={{ color: '#666', fontSize: 14 }}>
            まだお気に入りはありません
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {favoriteSpots.map((spot) => {
              const active = selectedSpot?.id === spot.id
              return (
                <div
                  key={spot.id}
                  style={{
                    border: active ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 12,
                    background: active ? '#eff6ff' : '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    onClick={() => onSelectSpot(spot)}
                    style={{ flex: 1, cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 800 }}>{spot.name || '名称未設定'}</div>

                    {!!spot.area && (
                      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                        {spot.area}
                      </div>
                    )}

                    {Array.isArray(spot.fish) && spot.fish.length > 0 && (
                      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                        狙える魚: {spot.fish.join('、')}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(spot)}
                    style={{
                      border: '1px solid #dc2626',
                      background: '#fff',
                      color: '#dc2626',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    削除
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          釣り場一覧
        </div>

        {!spots.length ? (
          <div style={{ color: '#666', fontSize: 14 }}>
            釣り場データがありません
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {spots.map((spot) => {
              const active = selectedSpot?.id === spot.id
              const fav = favoriteIds.has(spot.id)

              return (
                <div
                  key={spot.id}
                  style={{
                    border: active ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 12,
                    background: active ? '#eff6ff' : '#fff',
                  }}
                >
                  <div
                    onClick={() => onSelectSpot(spot)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {spot.name || '名称未設定'}
                      </div>
                      {fav && (
                        <div style={{ color: '#f59e0b', fontWeight: 800 }}>
                          ★
                        </div>
                      )}
                    </div>

                    {!!spot.area && (
                      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                        {spot.area}
                      </div>
                    )}

                    {Array.isArray(spot.fish) && spot.fish.length > 0 && (
                      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                        狙える魚: {spot.fish.join('、')}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(spot)}
                    style={{
                      marginTop: 10,
                      border: '1px solid #2563eb',
                      background: fav ? '#2563eb' : '#fff',
                      color: fav ? '#fff' : '#2563eb',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {fav ? '★ お気に入り済み' : '☆ お気に入り追加'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}