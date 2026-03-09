// src/lib/jcgAwaseTide.js
import JSZip from "jszip";

/**
 * 海上保安庁 推算値（泡瀬 4732）
 * ZIP内の txt は「1行=1日」「10分間隔の潮位が並ぶ」形式（例: YYYY MM DD 144個）
 * → 10分刻みに展開して {time, heightCm} の配列にする
 */

const memCache = new Map(); // year -> result

export async function loadAwaseTideYear(year = 2026) {
  const key = String(year);
  if (memCache.has(key)) return memCache.get(key);

  const url = `/jcg-tide/TIDE/gauge/tidedata/prediction/prediction4732_${year}.zip`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`JCG tide zip fetch failed: ${res.status} ${res.statusText}`);

  const ab = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(ab);

  const files = Object.keys(zip.files)
    .filter((name) => !zip.files[name].dir)
    .filter((name) => /\.(txt|csv|dat)$/i.test(name))
    .sort();

  if (files.length === 0) throw new Error("ZIP内に txt/csv/dat が見つかりませんでした");

  let allRows = [];
  let intervalMinutes = null;
  const okFiles = [];

  for (const fname of files) {
    const text = await zip.files[fname].async("string");
    try {
      const parsed = parseJcgDaily10MinFormat(text, year);
      if (parsed.rows.length >= 100) {
        allRows.push(...parsed.rows);
        okFiles.push(fname);
        intervalMinutes = intervalMinutes ?? parsed.intervalMinutes;
      }
    } catch {
      // 無視
    }
  }

  if (allRows.length === 0) {
    const sampleText = await zip.files[files[0]].async("string");
    const sample = sampleText
      .split("\n")
      .slice(0, 12)
      .map((l) => l.replace(/\r/g, ""))
      .join("\n");
    throw new Error(`どのファイルもパースできませんでした。例（${files[0]} 先頭12行）:\n${sample}`);
  }

  // 時刻順ソート & 重複除去（同一時刻は後勝ち）
  allRows.sort((a, b) => a.time.getTime() - b.time.getTime());
  const dedup = new Map(); // ms -> cm
  for (const r of allRows) dedup.set(r.time.getTime(), r.heightCm);
  allRows = Array.from(dedup.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ms, cm]) => ({ time: new Date(ms), heightCm: cm }));

  const dayMap = buildDayMap(allRows);

  const result = {
    year,
    sourceFile: okFiles.length >= 2 ? `${okFiles.length} files` : okFiles[0] ?? files[0],
    intervalMinutes: intervalMinutes ?? 10,
    dayMap,
  };

  memCache.set(key, result);

  // eslint-disable-next-line no-console
  console.log("[Awase4732] merged", {
    year,
    okFiles: okFiles.length,
    rows: allRows.length,
    days: dayMap.size,
    intervalMinutes: result.intervalMinutes,
    first: allRows[0]?.time?.toISOString(),
    last: allRows[allRows.length - 1]?.time?.toISOString(),
  });

  return result;
}

function buildDayMap(rows) {
  const dayMap = new Map();
  for (const r of rows) {
    const key = `${r.time.getFullYear()}${String(r.time.getMonth() + 1).padStart(2, "0")}${String(
      r.time.getDate()
    ).padStart(2, "0")}`;
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key).push(r);
  }
  for (const [k, arr] of dayMap.entries()) {
    arr.sort((a, b) => a.time.getTime() - b.time.getTime());
    dayMap.set(k, arr);
  }
  return dayMap;
}

/**
 * ★画像の形式に合わせた専用パーサ
 * 先頭行に「10分間隔推算値」などが入っていて、
 * 2行目以降が：YYYY MM DD + 10分ごとのcmが並ぶ
 */
export function parseJcgDaily10MinFormat(text, yearHint) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r/g, ""))
    .filter((l) => l.trim().length > 0);

  // 10分間隔をヘッダから拾えれば拾う（無ければ10）
  let intervalMinutes = 10;
  for (const l of lines.slice(0, 5)) {
    const m = l.match(/(\d+)\s*分間隔/);
    if (m) {
      const v = Number(m[1]);
      if (Number.isFinite(v) && v > 0 && v <= 60) intervalMinutes = v;
    }
  }

  const rows = [];

  for (const raw of lines) {
    const l = raw.trim();

    // ヘッダ除外
    if (l.startsWith("4732,")) continue;
    if (l.includes("推算値") || l.includes("データ：") || l.includes("10分間隔")) continue;

    // データ行：YYYY MM DD ...
    const parts = l.split(/\s+/);
    if (parts.length < 10) continue;

    if (!/^\d{4}$/.test(parts[0])) continue;

    const yyyy = Number(parts[0]);
    const mm = Number(parts[1]);
    const dd = Number(parts[2]);

    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) continue;
    if (yearHint && yyyy !== yearHint) continue;

    // 以降が潮位(cm)。画像だと 144個(10分×24h)くらい並ぶ
    const values = parts.slice(3).map((x) => Number(x));

    // 1日分として少なすぎるときは違う形式なのでスキップ
    if (values.length < 24) continue;

    const dayStart = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);

    for (let i = 0; i < values.length; i++) {
      const cm = values[i];
      if (!Number.isFinite(cm)) continue;

      const t = new Date(dayStart.getTime() + i * intervalMinutes * 60 * 1000);
      rows.push({ time: t, heightCm: Math.round(cm) });
    }
  }

  if (rows.length < 100) {
    // 形式違い/月ファイルじゃない等
    throw new Error("too few rows (daily10min format not matched)");
  }

  rows.sort((a, b) => a.time.getTime() - b.time.getTime());
  return { intervalMinutes, rows };
}

export function dayRowsToSeries(dayRows) {
  return (dayRows ?? []).map((r) => ({ time: r.time, heightCm: r.heightCm }));
}