import { useMemo, useState } from "react";
import DashboardPage from "./pages/DashboardPage.jsx";
import { SpotsPage } from "./features/spots/SpotsPage.jsx";

export function App() {
  const [tab, setTab] = useState("dashboard");

  const body = useMemo(() => {
    if (tab === "spots") return <SpotsPage />;
    return <DashboardPage />;
  }, [tab]);

  return (
    <div style={{ padding: 16 }}>
      <h1>沖縄 釣り情報</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab("dashboard")}
          disabled={tab === "dashboard"}
        >
          ダッシュボード
        </button>

        <button
          onClick={() => setTab("spots")}
          disabled={tab === "spots"}
        >
          釣り場管理
        </button>
      </div>

      {body}
    </div>
  );
}