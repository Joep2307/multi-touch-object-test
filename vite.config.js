import { fileURLToPath, URL } from "node:url";
import { connect } from "node:net";
import { defineConfig } from "vite";

// Waar de biblio-backend draait. `cd ../../GitHub/coco-biblio && cargo run`
// zet hem op 8081; met BIBLIO_API=... wijs je naar een andere.
const API = process.env.BIBLIO_API ?? "http://localhost:8081";

// Zonder backend werken is een volwaardige modus: de client valt dan terug op
// public/fixtures/. Vite's proxy zou daar per verzoek een ECONNREFUSED-stack
// bij loggen, dus polsen we de backend eerst (paar seconden gecached) en
// antwoorden we /api met een stille 503 zolang hij plat ligt. Komt hij op,
// dan loopt het verkeer er vanzelf weer doorheen.
// Overgenomen uit sturnia-node's vite.config.ts.
function backendGate() {
  const { hostname, port } = new URL(API);
  let up = null, checked = 0, announced = false;
  const probe = () =>
    new Promise((resolve) => {
      const s = connect({ host: hostname, port: Number(port) || 80 });
      s.setTimeout(300);
      s.once("connect", () => { s.destroy(); resolve(true); });
      s.once("error", () => resolve(false));
      s.once("timeout", () => { s.destroy(); resolve(false); });
    });
  return {
    name: "biblio-backend-gate",
    configureServer(server) {
      server.middlewares.use("/api", async (_req, res, next) => {
        const now = Date.now();
        if (up === null || now - checked > 3000) {
          up = await probe();
          checked = now;
          if (up && !announced) {
            announced = true;
            server.config.logger.info(`[puck-table] biblio-backend op ${API} draait — /api wordt doorgestuurd`);
          }
        }
        if (up) return next();
        res.writeHead(503, { "Content-Type": "text/plain" });
        res.end("biblio backend unavailable");
      });
    },
  };
}

export default defineConfig({
  // Relatieve asset-paden, zodat de build ook werkt achter een subpad
  // (http://server:8080/puck/) of rechtstreeks vanaf file://.
  base: "./",
  plugins: [backendGate()],
  resolve: {
    alias: {
      // Eén plek die bepaalt waar de BiblioClient vandaan komt. Wil je later
      // tegen de echte sturnia-node repo aan werken in plaats van de kopie in
      // vendor/, dan is dit de enige regel die verandert.
      "@biblio": fileURLToPath(new URL("./vendor/sturnia-node/api/index.ts", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Laat het veld "Adres van de backend" in de app leeg: de app vraagt dan
    // relatief om api/biblio/..., wat hier naar coco-biblio gaat.
    proxy: { "/api": { target: API, changeOrigin: true } },
  },
  preview: { host: true, port: 8080 },
  build: { outDir: "dist", target: "es2022" },
});
