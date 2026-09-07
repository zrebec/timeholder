import { defineConfig } from "vite";

export default defineConfig({
  // Relatívne cesty — appka funguje bez ohľadu na to v akom subpath sa serveruje
  base: "./",

  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Bez hashu v menách súborov; cache busting riešime cez CACHE_NAME v sw.js
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },

  server: {
    host: true, // počúvaj na všetkých interfaces — prístup z telefónu cez LAN
    port: 5500, // rovnaký port ako Go Live, muscle memory
  },

  preview: {
    host: true,
    port: 5500,
  },
});
