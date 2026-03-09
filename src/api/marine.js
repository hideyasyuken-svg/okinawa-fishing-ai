export async function fetchMarine(lat, lng) {
  const now = Date.now();

  return [
    {
      ts: now,
      windSpeed: 4.2,
      windDir: 110,
      waveHeight: 0.7,
      wavePeriod: 6.5,
    },
    {
      ts: now + 60 * 60 * 1000,
      windSpeed: 4.8,
      windDir: 120,
      waveHeight: 0.8,
      wavePeriod: 6.2,
    },
    {
      ts: now + 2 * 60 * 60 * 1000,
      windSpeed: 5.1,
      windDir: 135,
      waveHeight: 0.9,
      wavePeriod: 5.8,
    },
  ];
}