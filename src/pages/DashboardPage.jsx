import React, { useEffect, useMemo, useState } from "react";
import FavoriteSpotSection from "../components/FavoriteSpotSection";
import { loadAwaseTideYear } from "../lib/jcgAwaseTide.js";
import TideChart from "../components/TideChart";
import TideDayScroller from "../components/TideDayScroller";
import { fetchMarine } from "../api/marine"
import MarineCard from "../components/MarineCard"
import WindArrow from "../components/WindArrow";
import {
  calcFishingAI,
  degToDirJa,
  findNextHighTide,
  findTideExtrema,
  formatDayKey,
  formatHM,
  getNearestMarine,
  groupSeriesByDay,
  makeBestWindows,
} from "../utils/tideAdvanced";

const spots = [
  {
    id: "awase",
    name: "泡瀬漁港",
    area: "沖縄市",
    lat: 26.3345,
    lng: 127.8568,
    fish: ["チヌ", "タチウオ", "イカ"],
  },
  {
    id: "ginowan",
    name: "宜野湾マリーナ",
    area: "宜野湾市",
    lat: 26.2817,
    lng: 127.7314,
    fish: ["タマン", "アジ", "イカ"],
  },
  {
    id: "chatan",
    name: "北谷フィッシャリーナ",
    area: "北谷町",
    lat: 26.3092,
    lng: 127.7578,
    fish: ["タチウオ", "アジ", "チヌ"],
  },
  {
    id: "itoman",
    name: "糸満漁港",
    area: "糸満市",
    lat: 26.1242,
    lng: 127.6655,
    fish: ["グルクン", "ミーバイ", "イカ"],
  },
];

const pad2 = (n) => String(n).padStart(2, "0");

function hmFromTime(t) {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function mdhmFromTime(t) {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}

function ymdKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function sameDay(a, b) {
  return ymdKey(a) === ymdKey(b);
}

function toMs(v) {
  if (v == null) return null;
  if (typeof v === "number") {
    if (v > 1e12) return v;
    if (v > 1e9) return v * 1000;
    return null;
  }
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function toHeight(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractSeriesFromAwase(res) {
  if (!res) return [];

  if (res?.dayMap instanceof Map || res?.merged?.dayMap instanceof Map) {
    const map = res.dayMap ?? res.merged?.dayMap;
    const raw = [];

    for (const [dayKey, day] of map.entries()) {
      if (Array.isArray(day)) {
        raw.push(...day);
      } else if (Array.isArray(day?.rows)) {
        raw.push(...day.rows);
      } else if (Array.isArray(day?.data)) {
        raw.push(...day.data);
      } else if (Array.isArray(day?.series)) {
        raw.push(...day.series);
      } else if (Array.isArray(day?.points)) {
        raw.push(...day.points);
      }
    }

    console.log("dayMap raw count =", raw.length);
    console.log("dayMap first raw =", raw[0]);

    const mapped = raw
      .map((row) => {
        if (Array.isArray(row) && row.length >= 2) {
          const t = toMs(row[0]);
          const h = toHeight(row[1]);
          if (t != null && h != null) return { t, h };
        }

        const t =
          toMs(row?.t) ??
          toMs(row?.time) ??
          toMs(row?.date) ??
          toMs(row?.datetime) ??
          toMs(row?.timestamp) ??
          toMs(row?.dt);

        const h =
  toHeight(row?.h) ??
  toHeight(row?.height) ??
  toHeight(row?.heightCm) ??
  toHeight(row?.tide) ??
  toHeight(row?.level) ??
  toHeight(row?.value);

        if (t != null && h != null) return { t, h };

        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.t - b.t);

    console.log("tide rows from dayMap =", mapped.length);
    return mapped;
  }

  return [];
}

function findLocalExtremes(series) {
  const highs = [];
  const lows = [];

  if (!Array.isArray(series) || series.length < 3) {
    return { highs, lows };
  }

  for (let i = 1; i < series.length - 1; i++) {
    const prev = series[i - 1];
    const curr = series[i];
    const next = series[i + 1];

    if (curr.h >= prev.h && curr.h >= next.h) {
      highs.push(curr);
    }
    if (curr.h <= prev.h && curr.h <= next.h) {
      lows.push(curr);
    }
  }

  return { highs, lows };
}

function buildTodayBestTime(series, nowMs) {
  if (!Array.isArray(series) || series.length < 3) return null;

  const todaySeries = series.filter((p) => sameDay(p.t, nowMs));
  if (todaySeries.length < 3) return null;

  const { highs, lows } = findLocalExtremes(todaySeries);
  const candidates = [...highs, ...lows];

  if (!candidates.length) return null;

  let best = null;
  let bestScore = -Infinity;

  for (const p of candidates) {
    const diffMin = Math.abs(p.t - nowMs) / (60 * 1000);
    const closeness = Math.max(0, 100 - diffMin / 3);

    let amp = 0;
    const idx = todaySeries.findIndex((x) => x.t === p.t);
    if (idx > 0 && idx < todaySeries.length - 1) {
      amp =
        Math.abs(todaySeries[idx].h - todaySeries[idx - 1].h) +
        Math.abs(todaySeries[idx].h - todaySeries[idx + 1].h);
    }

    const score = closeness + amp * 120;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  if (!best) return null;

  const start = best.t - 90 * 60 * 1000;
  const end = best.t + 90 * 60 * 1000;

  return {
    center: best.t,
    start,
    end,
    label: `${hmFromTime(start)}〜${hmFromTime(end)}`,
  };
}

function buildFishingScore(series, nowMs) {
  if (!Array.isArray(series) || series.length < 3) return 0;

  const { highs, lows } = findLocalExtremes(series);
  const candidates = [...highs, ...lows];
  if (!candidates.length) return 40;

  let nearest = candidates[0];
  let minDiff = Math.abs(candidates[0].t - nowMs);

  for (const p of candidates) {
    const diff = Math.abs(p.t - nowMs);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = p;
    }
  }

  const diffMin = Math.abs(nearest.t - nowMs) / (60 * 1000);

  let score = 35;
  if (diffMin <= 30) score = 95;
  else if (diffMin <= 60) score = 88;
  else if (diffMin <= 90) score = 80;
  else if (diffMin <= 120) score = 72;
  else if (diffMin <= 180) score = 60;
  else score = 45;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function pickNextHighTide(series, nowMs) {
  const { highs } = findLocalExtremes(series);
  return highs.find((p) => p.t >= nowMs) || null;
}

function getNowTide(series, nowMs) {
  if (!Array.isArray(series) || !series.length) return null;

  let best = series[0];
  let minDiff = Math.abs(series[0].t - nowMs);

  for (const p of series) {
    const diff = Math.abs(p.t - nowMs);
    if (diff < minDiff) {
      minDiff = diff;
      best = p;
    }
  }

  return best;
}

function DashboardPageInner() {
  const [selectedSpot, setSelectedSpot] = useState(spots[0] || null);
  const [tideSeries, setTideSeries] = useState([]);
  const [tideError, setTideError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const [marineRows, setMarineRows] = useState([]);

  useEffect(() => {

  async function loadMarine() {

    const rows = await fetchMarine(selectedSpot?.lat, selectedSpot?.lng);

    setMarineRows(Array.isArray(rows) ? rows : []);

  }

  loadMarine();

}, [selectedSpot]);

  useEffect(() => {
  async function loadMarine() {
    const rows = await fetchMarine(selectedSpot?.lat, selectedSpot?.lng);

    setMarineRows(Array.isArray(rows) ? rows : []);
  }

  loadMarine();
}, [selectedSpot]);

  const groups = useMemo(() => {
  return groupSeriesByDay(tideSeries || []);
}, [tideSeries]);

const todayKey = formatDayKey(nowMs);

const currentMarine = useMemo(() => {
  if (!Array.isArray(marineRows) || marineRows.length === 0) return null;
  return marineRows[0];
}, [marineRows]);

const moonAge = getMoonAge();

const today = useMemo(() => {
  return groups.find((g) => g.key === todayKey) || groups[0] || null;
}, [groups, todayKey]);

const futureGroups = useMemo(() => {
  return groups
    .filter((g) => g.key !== today?.key)
    .map((g) => ({
      key: g.key,
      rows: g.rows,
      dateTs: g.dateTs || g.rows?.[0]?.t || Date.now(),
    }));
}, [groups, today]);

const tideEvents = useMemo(() => {
  return findTideExtrema(tideSeries || []);
}, [tideSeries]);

const bestWindows = useMemo(() => {
  return makeBestWindows(tideEvents, 90, 90);
}, [tideEvents]);

const marineNow = useMemo(() => {
  return getNearestMarine(marineRows, nowMs);
}, [marineRows, nowMs]);

const fishingAI = useMemo(() => {
  return calcFishingAI({
    series: tideSeries || [],
    bestWindows,
    marine: marineNow,
    nowTs: nowMs,
  });
}, [tideSeries, bestWindows, marineNow, nowMs]);

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadTide() {
      try {
        setTideError("");

        const year = new Date().getFullYear();
        const res = await loadAwaseTideYear(year);
        const allSeries = extractSeriesFromAwase(res);
       

        if (!alive) return;

        if (!Array.isArray(allSeries) || allSeries.length === 0) {
          setTideSeries([]);
          setTideError("潮データが空です");
          return;
        }

        const t0 = nowMs - 3.5 * 24 * 60 * 60 * 1000;
        const t1 = nowMs + 3.5 * 24 * 60 * 60 * 1000;

        const weekSeries = allSeries.filter((p) => p.t >= t0 && p.t <= t1);
        setTideSeries(weekSeries);
        try {
  const rows = await fetchMarine(selectedSpot?.lat, selectedSpot?.lng);

setMarineRows(Array.isArray(rows) ? rows : []);
} catch (e) {
  console.warn("marine fetch error", e);
  setMarineRows([]);
}
      } catch (e) {
        if (!alive) return;
        setTideSeries([]);
        setTideError(String(e?.message ?? e));
      }
    }

    loadTide();

    return () => {
      alive = false;
    };
  }, [nowMs]);

  const nextHigh = useMemo(() => pickNextHighTide(tideSeries, nowMs), [tideSeries, nowMs]);

  const bestTimeToday = useMemo(
    () => buildTodayBestTime(tideSeries, nowMs),
    [tideSeries, nowMs]
  );

  const nowTide = useMemo(() => getNowTide(tideSeries, nowMs), [tideSeries, nowMs]);

  const fishingScore = useMemo(() => {
  let score = 50;



  if (bestTimeToday) score += 20;
  if (nextHigh) score += 10;
  if (nowTide && Number.isFinite(nowTide.h)) score += 5;

  let ws = NaN;
let wh = NaN;
let wp = NaN;

  if (currentMarine) {
      ws = Number(currentMarine.windSpeed);
  wh = Number(currentMarine.waveHeight);
  wp = Number(currentMarine.wavePeriod);

    if (Number.isFinite(ws)) {
      if (ws < 3) score += 15;
      else if (ws < 6) score += 5;
      else if (ws >= 8) score -= 20;
      else score -= 10;
    }

    if (Number.isFinite(wh)) {
      if (wh < 0.6) score += 12;
      else if (wh < 1.0) score += 6;
      else if (wh >= 1.5) score -= 18;
      else score -= 6;
    }

    if (Number.isFinite(wp)) {
      if (wp >= 6 && wp <= 9) score += 8;
      else if (wp < 4) score -= 5;
    }
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  const wd = Number(currentMarine?.windDir);

const aiScore = calcFishingIndex({
  tideScore: score,
  windSpeed: ws,
  waveHeight: wh,
  windDir: wd
});

  return aiScore;

}, [bestTimeToday, nextHigh, nowTide, currentMarine]);

const currentHour = new Date(nowMs).getHours();

const windDirNow = Number(currentMarine?.windDir);
const windLabel = getWindLabel(windDirNow, 180);

const fishRecommendation = getFishRecommendation(currentHour, fishingScore);
const catchChance = calcCatchChance(fishingScore, moonAge);
const scoreLabel = getScoreLabel(fishingScore);

const scoreColor = getScoreColor(fishingScore);
const tideFlowLabel = getTideFlowLabel(nowTide, nextHigh);
const nextChanceTime = getNextChanceTime(bestTimeToday, fishingScore, nowMs);

  const todayRangeText = useMemo(() => {
    const today = tideSeries.filter((p) => sameDay(p.t, nowMs));
    if (!today.length) return "--";
    const min = Math.min(...today.map((p) => p.h));
    const max = Math.max(...today.map((p) => p.h));
    return `${min.toFixed(2)}m 〜 ${max.toFixed(2)}m`;
  }, [tideSeries, nowMs]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f6fb",
        padding: 16,
      }}
    >
      <div
  style={{
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
    border: "1px solid #e5e7eb",
  }}
>
  <div
    style={{
      fontSize: 20,
      fontWeight: 800,
      marginBottom: 12,
      color: "#0f172a",
    }}
  >
    🗾 沖縄釣りマップ
  </div>

  <img
  src="/okinawa-map.png"
  alt="沖縄釣りマップ"
  style={{
    width: "100%",
    maxHeight: 260,
    objectFit: "cover",
    borderRadius: 12
  }}
/>

  <div
    style={{
      marginTop: 10,
      fontSize: 13,
      color: "#64748b",
      lineHeight: 1.6,
    }}
  >
    沖縄本島の釣りエリアをイメージで確認できます。
  </div>
</div>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#fff",
            borderRadius: 18,
            padding: 20,
            boxShadow: "0 10px 30px rgba(37,99,235,0.22)",
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9 }}>沖縄 釣り情報</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
            潮・時合いダッシュボード
          </div>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.95 }}>
            選択中の釣り場: {selectedSpot?.name || "未選択"}
            {selectedSpot?.area ? `（${selectedSpot.area}）` : ""}
          </div>
        </div>

        <FavoriteSpotSection
          spots={spots}
          selectedSpot={selectedSpot}
          onSelectSpot={setSelectedSpot}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <InfoCard
            title="次の満潮"
            value={nextHigh ? mdhmFromTime(nextHigh.t) : "--"}
            sub={nextHigh ? `潮位 ${nextHigh.h.toFixed(2)}m` : "データなし"}
          />
          <InfoCard
  title="釣り指数"
  value={`${fishingScore}`}
  sub={scoreLabel}
  valueColor={scoreColor}
/>
          <InfoCard
            title="今日のベスト時間"
            value={bestTimeToday ? bestTimeToday.label : "--"}
            sub={bestTimeToday ? `中心 ${hmFromTime(bestTimeToday.center)}` : "データなし"}
          />
          <InfoCard
  title="現在の潮位"
  value={nowTide ? `${nowTide.h.toFixed(2)}m` : "--"}
/>

<div
  style={{
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  }}
>
  <div style={{ gridColumn: "1 / -1" }}>
  <div style={{ gridColumn: "1 / -1" }}>
  <MarineCard marine={currentMarine} />
</div>
</div>
</div>

        </div>

        <SectionCard title="今日の潮グラフ">
  {tideError ? (
    <div
      style={{
        color: "#b91c1c",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 12,
        padding: 12,
      }}
    >
      {tideError}
    </div>
  ) : (
    <TideChart
      series={tideSeries}
      nowTs={nowMs}
      height={320}
      showNowLine
      showExtrema
      showBestWindows
    />
  )}
</SectionCard>

        <SectionCard title="明日以降の潮">
  <TideDayScroller
  dayGroups={futureGroups}
  nowMs={nowMs}
  bestWindowsByDay={Object.fromEntries(
    groups.map((g) => [
      g.key,
      makeBestWindows(findTideExtrema(g.rows || []), 90, 90),
    ])
  )}
/>
</SectionCard>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >

<SectionCard title="月齢">
  <div style={{ fontSize: 26, fontWeight: 700 }}>
    {moonAge}
  </div>
</SectionCard>

<SectionCard title="風評価">
  <div style={{ fontSize: 26, fontWeight: 700 }}>
    {windLabel}
  </div>
</SectionCard>

<SectionCard title="おすすめ魚">
  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.5 }}>
    {fishRecommendation}
  </div>
</SectionCard>

<SectionCard title="釣れる確率">
  <div style={{ fontSize: 26, fontWeight: 700 }}>
    {catchChance}%
  </div>
</SectionCard>

<SectionCard title="潮流">
  <div style={{ fontSize: 26, fontWeight: 700 }}>
    {tideFlowLabel}
  </div>
</SectionCard>

<SectionCard title="次のチャンスタイム">
  <div style={{ fontSize: 22, fontWeight: 700 }}>
    {nextChanceTime}
  </div>
</SectionCard>

          <SectionCard title="選択中の釣り場メモ">
            <div style={{ display: "grid", gap: 8 }}>
              <Row label="釣り場名" value={selectedSpot?.name || "--"} />
              <Row label="エリア" value={selectedSpot?.area || "--"} />
              <Row
                label="狙える魚"
                value={
                  Array.isArray(selectedSpot?.fish) && selectedSpot.fish.length
                    ? selectedSpot.fish.join("、")
                    : "--"
                }
              />
              <Row
                label="座標"
                value={
                  selectedSpot?.lat != null && selectedSpot?.lng != null
                    ? `${selectedSpot.lat}, ${selectedSpot.lng}`
                    : "--"
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="使い方">
            <div style={{ display: "grid", gap: 8, color: "#334155", lineHeight: 1.7 }}>
              <div>・上の釣り場一覧からお気に入り登録できます。</div>
              <div>・お気に入りを押すと次回アクセス時も保存されます。</div>
              <div>・緑帯は今日のベスト時間帯の目安です。</div>
              <div>・赤線は現在時刻です。</div>
              <div>・この版の潮位は現在、泡瀬ベースのデータ表示です。</div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value, sub, valueColor }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>{title}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: valueColor || "#0f172a",
          marginTop: 10,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>{sub}</div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "#0f172a",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: 8,
        padding: "8px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: 14 }}>{value}</div>
    </div>
  );
}

function scoreLabel(score) {
  if (score >= 90) return "かなり期待";
  if (score >= 75) return "チャンス高め";
  if (score >= 60) return "まずまず";
  if (score >= 45) return "様子見";
  return "低め";
}

function calcWindPenalty(windDir, windSpeed, spotDir = 180) {

  
  if (!windDir) return 0;

  let diff = Math.abs(windDir - spotDir);
  if (diff > 180) diff = 360 - diff;

  if (diff < 45) return -20;     // 向かい風
  if (diff < 90) return -10;     // 横風
  if (diff > 135) return +5;     // 追い風
  return 0;
}

function calcFishingIndex({
  tideScore,
  windSpeed,
  waveHeight,
  windDir
}) {

  let score = tideScore;

  const moonAge = getMoonAge();

if (moonAge === 0 || moonAge === 29) score += 8;   // 新月
else if (moonAge >= 13 && moonAge <= 16) score += 6; // 満月前後

  // 風
  if (windSpeed > 10) score -= 20;
  else if (windSpeed > 7) score -= 10;

  // 波
  if (waveHeight > 2) score -= 20;
  else if (waveHeight > 1.5) score -= 10;

  // 向かい風AI
  score += calcWindPenalty(windDir, windSpeed);

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return Math.round(score);
}

function getMoonAge(date = new Date()) {
  const lp = 2551443;
  const newMoon = new Date(1970, 0, 7, 20, 35, 0);
  const phase = ((date - newMoon) / 1000) % lp;
  return Math.floor(phase / (24 * 3600));
}

function getWindLabel(windDir, spotDir = 180) {
  if (!Number.isFinite(windDir)) return "不明";

  let diff = Math.abs(windDir - spotDir);
  if (diff > 180) diff = 360 - diff;

  if (diff < 45) return "向かい風";
  if (diff < 90) return "横風";
  if (diff > 135) return "追い風";
  return "斜め風";
}

function getFishRecommendation(hour, fishingScore) {
  if (hour >= 4 && hour <= 7) {
    if (fishingScore >= 75) return "タマン・ガーラ狙い目";
    return "朝まずめで回遊魚チャンス";
  }

  if (hour >= 18 && hour <= 22) {
    if (fishingScore >= 75) return "アオリイカ・ミーバイ狙い目";
    return "夜釣りで根魚おすすめ";
  }

  if (hour >= 10 && hour <= 15) {
    return "ライトゲーム・小物釣り向き";
  }

  return "まったり釣りタイム";
}

function calcCatchChance(fishingScore, moonAge) {
  let chance = fishingScore;

  if (moonAge === 0 || moonAge === 29) chance += 8;     // 新月
  else if (moonAge >= 13 && moonAge <= 16) chance += 5; // 満月前後

  if (chance > 100) chance = 100;
  if (chance < 0) chance = 0;

  return Math.round(chance);
}

function getScoreLabel(score) {
  if (score >= 85) return "かなり期待";
  if (score >= 70) return "チャンス高め";
  if (score >= 50) return "まずまず";
  return "様子見";
}

function getScoreColor(score) {
  if (score >= 85) return "#16a34a";
  if (score >= 70) return "#ca8a04";
  if (score >= 50) return "#ea580c";
  return "#dc2626";
}

function getTideFlowLabel(nowTide, nextHigh) {
  if (!nowTide?.t || !nextHigh?.t) return "不明";

  const now = new Date(nowTide.t).getTime();
  const high = new Date(nextHigh.t).getTime();
  const diffMin = (high - now) / 60000;

  if (Math.abs(diffMin) <= 30) return "潮止まり前後";
  if (diffMin > 0) return "上げ潮";
  return "下げ潮";
}

function getNextChanceTime(bestTimeToday, fishingScore, nowMs) {
  if (!bestTimeToday?.center) return "--:--〜--:--";

  const center = new Date(bestTimeToday.center).getTime();
  const widthMin = fishingScore >= 80 ? 90 : fishingScore >= 60 ? 60 : 45;

  const start = center - widthMin * 60000;
  const end = center + widthMin * 60000;

  return `${hmFromTime(start)}〜${hmFromTime(end)}`;
}

export default function DashboardPage() {
  return <DashboardPageInner />;
}

