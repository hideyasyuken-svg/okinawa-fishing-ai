import React from "react";

// Open-Meteo wind_direction_10m は「FROM（吹いてくる方角）」
// 矢印は「TO（吹いていく方向＝物が飛んでいく方向）」にしたい
// => FROM + 180° を向ける
export default function WindArrow({ fromDeg, size = 22 }) {
  const from = Number(fromDeg);
  const to = Number.isFinite(from) ? (from + 180) % 360 : 0;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        transform: `rotate(${to}deg)`,
        transformOrigin: "50% 50%",
        fontSize: size,
        lineHeight: 1,
        userSelect: "none",
      }}
      title={
        Number.isFinite(from)
          ? `風向(FROM): ${Math.round(from)}° / 確認用: TO ${Math.round(to)}°（吹いていく方向）`
          : "風向不明"
      }
      aria-label="wind arrow"
    >
      →
    </span>
  );
}