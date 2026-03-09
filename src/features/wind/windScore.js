const normDeg = (d) => {
  const x = d % 360;
  return x < 0 ? x + 360 : x;
};

const angDiff = (a, b) => {
  const x = Math.abs(normDeg(a) - normDeg(b));
  return Math.min(x, 360 - x);
};

// 8方位の矢印（角度→矢印）
export function arrow8(deg) {
  const d = normDeg(deg);
  // 0:N, 45:NE, 90:E ... の8分割
  const idx = Math.round(d / 45) % 8;
  return ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][idx];
}

export function windScoreAtTime({ wind, t, seaBearingDeg }) {
  if (!wind?.length || seaBearingDeg == null) {
    return {
      score: 0.6,
      label: "○ 風スコア:未設定",
    };
  }

  // 一番近い時刻の風を拾う
  let best = wind[0];
  let bestDt = Math.abs(wind[0].t - t);
  for (const w of wind) {
    const dt = Math.abs(w.t - t);
    if (dt < bestDt) {
      best = w;
      bestDt = dt;
    }
  }

  // best.direction は「吹いてくる方向（FROM）」
  const fromDeg = normDeg(best.direction);
  const toDeg = normDeg(best.direction + 180);

  // 海がある方向（海方向）→オンショアは「海から吹いてくる」＝ from が海方向付近
  const onshoreFrom = normDeg(seaBearingDeg);
  const offshoreFrom = normDeg(seaBearingDeg + 180);

  const dOn = angDiff(fromDeg, onshoreFrom);
  const dOff = angDiff(fromDeg, offshoreFrom);

  // 風速ペナルティ（ざっくり：強風ほど下げる）
  const speedPenalty = Math.max(0, Math.min(0.35, best.speed / 20));

  let base, kind, symbol;
  if (dOff <= 60) {
    base = 0.9;
    kind = "オフショア";
    symbol = "◎";
  } else if (dOn <= 60) {
    base = 0.45;
    kind = "オンショア";
    symbol = "△";
  } else {
    base = 0.7;
    kind = "横風";
    symbol = "○";
  }

  const score = Math.max(0, Math.min(1, base - speedPenalty));

  const fromArrow = arrow8(fromDeg);
  const toArrow = arrow8(toDeg);

  return {
    score,
    // A: ◎○△ + B: 矢印（FROM/TOも一緒に出して誤解を防ぐ）
    label: `${symbol} 風:${kind} ${best.speed.toFixed(1)}m/s  FROM ${fromArrow}${Math.round(fromDeg)}° → TO ${toArrow}${Math.round(toDeg)}°`,
  };
}