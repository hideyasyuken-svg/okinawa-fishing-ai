// vite.config.js（全置き換え）
// ✅ React + Vite
// ✅ 気象庁（/jma-tide）・海保（/jcg-tide）どっちもCORS回避プロキシ

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 気象庁 潮位表
      "/jma-tide": {
        target: "https://www.data.jma.go.jp",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jma-tide/, ""),
      },

      // 海上保安庁 潮汐（泡瀬4732など推算値ZIP）
      "/jcg-tide": {
        target: "https://www1.kaiho.mlit.go.jp",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jcg-tide/, ""),
      },
    },
  },
});