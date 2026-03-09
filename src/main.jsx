import "leaflet/dist/leaflet.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.jsx";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error('index.html に <div id="root"></div> がありません');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);