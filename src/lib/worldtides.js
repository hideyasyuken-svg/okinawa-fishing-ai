export async function fetchWorldTidesExtremes({ apiKey, lat, lon, startISO, days }) {
  const url = new URL("https://www.worldtides.info/api/v3");
  url.searchParams.set("extremes", "");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("start", startISO);
  url.searchParams.set("days", String(days));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`WorldTides error: ${res.status}`);

  const json = await res.json();
  const extremes = json?.extremes ?? [];

  return extremes
    .map((e) => ({
      dt: Number(e.dt), // seconds
      height: Number(e.height), // meters
      type: e.type, // "High"/"Low" が来ることが多い
    }))
    .filter((p) => Number.isFinite(p.dt) && Number.isFinite(p.height))
    .sort((a, b) => a.dt - b.dt);
}