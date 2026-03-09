export async function getTide(lat, lon) {
  const key = import.meta.env.VITE_WORLD_TIDES_KEY;

  const url = `https://www.worldtides.info/api/v3?heights&extremes&lat=${lat}&lon=${lon}&key=${key}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Tide API error");
  }

  return await res.json();
}