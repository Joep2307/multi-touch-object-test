import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// Relatieve asset-paden, zodat de build ook werkt achter een subpad
// (http://server:8080/puck/) of rechtstreeks vanaf file://.
export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      // Eén plek die bepaalt waar de BiblioClient vandaan komt. Wil je later
      // tegen de echte sturnia-node repo aan werken in plaats van de kopie in
      // vendor/, dan is dit de enige regel die verandert.
      "@biblio": fileURLToPath(new URL("./vendor/sturnia-node/api/index.ts", import.meta.url)),
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 8080 },
  build: { outDir: "dist", target: "es2022" },
});
