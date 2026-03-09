// src/components/MoonPhaseIcon.jsx
import React, { useMemo } from "react";

// ざっくり月齢計算（新月基準からの経過で8分類）
// 精密天文ではないけど「表示用」に十分きれいに出ます。
function moonPhaseIndex(date = new Date()) {
  // 既知の新月（2000-01-06 18:14 UTC）を基準
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodic = 29.53058867; // 朔望月（日）

  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const days = (ms - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = ((days % synodic) + synodic) % synodic; // 0..29.53
  const p = phase / synodic; // 0..1

  // 8分割（新月→上弦→満月→下弦）
  const idx = Math.floor((p * 8) + 0.5) % 8;
  return idx;
}

const PHASES = [
  { emoji: "🌑", label: "新月" },
  { emoji: "🌒", label: "三日月" },
  { emoji: "🌓", label: "上弦" },
  { emoji: "🌔", label: "十三夜" },
  { emoji: "🌕", label: "満月" },
  { emoji: "🌖", label: "十六夜" },
  { emoji: "🌗", label: "下弦" },
  { emoji: "🌘", label: "有明月" },
];

export default function MoonPhaseIcon({ date = new Date(), size = 22, showLabel = true }) {
  const phase = useMemo(() => PHASES[moonPhaseIndex(date)], [date]);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: size, lineHeight: 1 }} aria-label="moon">
        {phase.emoji}
      </span>
      {showLabel ? <span style={{ fontWeight: 900 }}>{phase.label}</span> : null}
    </span>
  );
}