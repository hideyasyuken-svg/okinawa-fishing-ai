export async function fetchWindHourly({ lat, lon, timezone }) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m");
  url.searchParams.set("timezone", timezone);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const json = await res.json();

  const time = json?.hourly?.time ?? [];
  const ws = json?.hourly?.wind_speed_10m ?? [];
  const wd = json?.hourly?.wind_direction_10m ?? [];

  const out = [];
  for (let i = 0; i < time.length; i++) {
    const t = Date.parse(time[i]);
    const speed = Number(ws[i]);
    const direction = Number(wd[i]);
    if (!Number.isFinite(t) || !Number.isFinite(speed) || !Number.isFinite(direction)) continue;
    out.push({ t, speed, direction });
  }
  return out.sort((a, b) => a.t - b.t);
}