// src/lib/jmaTide.js
// 気象庁「潮位表（テキストデータ）」を地点コードで取得してパースする。
// テキストは：/kaiyou/data/db/tide/suisan/txt/YYYY/STN.txt 形式（例：NH）
// フォーマット定義：毎時潮位(3桁×24) + 年月日 + 地点記号 + 満潮/干潮 …（固定幅）

const cache = new Map(); // key: `${year}-${stn}` → Map(yyyymmdd -> dayObj)

export const JMA_STATIONS_OKINAWA_MAIN = [
  // station.php 掲載地点（2026）より（緯度経度も同ページ値を使う）
  // NH 那覇 26°13′N 127°40′E
  // NK 中城湾港 26°20′N 127°50′E
  // ZO 沖縄 26°11′N 127°49′E
  { stn: "NH", name: "那覇", lat: 26 + 13 / 60, lon: 127 + 40 / 60 },
  { stn: "NK", name: "中城湾港", lat: 26 + 20 / 60, lon: 127 + 50 / 60 },
  { stn: "ZO", name: "沖縄", lat: 26 + 11 / 60, lon: 127 + 49 / 60 },
];

// 最寄り地点（単純距離）
export function pickNearestStation(lat, lon, stations = JMA_STATIONS_OKINAWA_MAIN) {
  let best = stations[0] ?? null;
  let bestD = Infinity;
  for (const s of stations) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 年ファイルを読み、日付Mapにする
export async function loadJmaYear({ year, stn }) {
  const key = `${year}-${stn}`;
  if (cache.has(key)) return cache.get(key);

  const url = `/jma-tide/kaiyou/data/db/tide/suisan/txt/${year}/${stn}.txt`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JMA tide fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();

  const dayMap = parseJmaTideText(text, stn, year);
  cache.set(key, dayMap);
  return dayMap;
}

// 固定幅パーサ
export function parseJmaTideText(text, stn, year) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r/g, ""))
    .filter((l) => l.trim().length > 0);

  const map = new Map(); // key yyyymmdd

  for (const line of lines) {
    // 短い行はスキップ
    if (line.length < 136) continue;

    // 1) 毎時潮位: 1〜72カラム（0..71） 3桁×24
    const hourlyBlock = line.slice(0, 72);

    // 2) 年月日: 73〜78（72..77） 2桁×3
    const yy = parseInt(line.slice(72, 74), 10);
    const mm = parseInt(line.slice(74, 76), 10);
    const dd = parseInt(line.slice(76, 78), 10);
    if (![yy, mm, dd].every(Number.isFinite)) continue;

    const yyyy = 2000 + yy;
    if (yyyy !== year) continue;

    // 3) 地点記号: 79〜80（78..79）
    const stn2 = line.slice(78, 80).trim();
    if (stn2 !== stn) continue;

    // hourly 24 values
    const hourlyCm = [];
    for (let h = 0; h < 24; h++) {
      const vStr = hourlyBlock.slice(h * 3, h * 3 + 3);
      const v = parseInt(vStr.trim(), 10);
      hourlyCm.push(Number.isFinite(v) ? v : null);
    }

    // 4) 満潮×4: 81〜108（80..107） 7文字×4（時刻4 + 潮位3）
    const highs = parseHiLo(line.slice(80, 108), yyyy, mm, dd, "満潮");

    // 5) 干潮×4: 109〜136（108..135）
    const lows = parseHiLo(line.slice(108, 136), yyyy, mm, dd, "干潮");

    const key = `${yyyy}${String(mm).padStart(2, "0")}${String(dd).padStart(2, "0")}`;
    map.set(key, {
      stn,
      date: new Date(yyyy, mm - 1, dd),
      hourlyCm,
      highs,
      lows,
    });
  }

  return map;
}

function parseHiLo(block, yyyy, mm, dd, type) {
  const arr = [];
  // 7文字×4
  for (let i = 0; i < 4; i++) {
    const part = block.slice(i * 7, i * 7 + 7);
    if (part.length < 7) continue;

    const tStr = part.slice(0, 4).trim(); // HHMM or 9999
    const hStr = part.slice(4, 7).trim(); // cm or 999
    if (!tStr || tStr === "9999") continue;

    const hh = parseInt(tStr.slice(0, 2), 10);
    const mi = parseInt(tStr.slice(2, 4), 10);
    const cm = parseInt(hStr, 10);
    if (![hh, mi, cm].every(Number.isFinite)) continue;

    arr.push({
      type,
      time: new Date(yyyy, mm - 1, dd, hh, mi, 0),
      heightCm: cm,
    });
  }
  return arr;
}

// 1日分を series（10分刻み）にして返す（グラフ滑らか用）
export function expandHourlyTo10MinSeries(dayObj) {
  const { date, hourlyCm } = dayObj;
  const pts = [];
  for (let h = 0; h < 24; h++) {
    const v0 = hourlyCm[h];
    const v1 = hourlyCm[(h + 1) % 24];
    for (let k = 0; k < 6; k++) {
      const t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, k * 10, 0);
      let cm = null;
      if (v0 == null) cm = null;
      else if (k === 0) cm = v0;
      else if (v1 == null) cm = v0;
      else {
        const u = k / 6;
        cm = Math.round(v0 + (v1 - v0) * u);
      }
      pts.push({ time: t, heightCm: cm });
    }
  }
  // 24:00相当の終点
  pts.push({
    time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 24, 0, 0),
    heightCm: hourlyCm[0] ?? null,
  });
  return pts;
}