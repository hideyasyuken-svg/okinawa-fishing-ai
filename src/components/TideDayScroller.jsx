import React from "react";
import TideChart from "./TideChart";
import { formatJPDate } from "../utils/tideAdvanced";

export default function TideDayScroller({
  dayGroups = [],
  nowTs = Date.now(),
  bestWindowsByDay = {},
}) {
  if (!dayGroups.length) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 4,
      }}
    >
      {dayGroups.map((day) => (
        <div
          key={day.key}
          style={{
            minWidth: 280,
            background: "rgba(15,23,42,0.35)",
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: 16,
            padding: 10,
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              color: "#e2e8f0",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            {formatJPDate(day.dateTs)}
          </div>

          <TideChart
            series={day.rows}
            nowTs={nowTs}
            height={170}
            small
            showNowLine={false}
            showExtrema
            showBestWindows
            bestWindows={bestWindowsByDay?.[day.key] || []}
          />
        </div>
      ))}
    </div>
  );
}