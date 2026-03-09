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
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <header
        style={{
          padding: 12,
          borderBottom: "1px solid #ddd",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18 }}>沖縄 釣り情報</h1>

        <nav style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTab("dashboard")} disabled={tab === "dashboard"}>
            ダッシュボード
          </button>
          <button onClick={() => setTab("spots")} disabled={tab === "spots"}>
            釣り場管理
          </button>
        </nav>
      </header>

      <main>{body}</main>
    </div>
  );
}