import { fileURLToPath, URL } from "node:url";
import { connect } from "node:net";
import { defineConfig, type Plugin } from "vite";

// Where the biblio backend runs. `cd ../../GitHub/coco-biblio && cargo run`
// puts it on 8081; use BIBLIO_API=... to point at a different one.
const API = process.env.BIBLIO_API ?? "http://localhost:8081";

// The conversation transcriber runs separately from the biblio backend (see
// deploy/TRANSCRIPTIE.md). On the table the page finds it itself on port 8770;
// here we route /api/transcribe there, so that during development it's the
// same origin and CORS doesn't come into play.
const STT = process.env.STT_API ?? "http://localhost:8770";

// Working without a backend is a fully supported mode: the client then falls
// back to exe/public/fixtures/. Vite's proxy would log an ECONNREFUSED stack
// trace for every request in that case, so we probe the backend first (cached
// for a few seconds) and answer /api with a silent 503 as long as it's down.
// Once it comes up, traffic flows through it again automatically.
// Carried over from sturnia-node's vite.config.ts.
function backendGate(): Plugin {
    const { hostname, port } = new URL(API);
    let up: boolean | null = null,
        checked = 0,
        announced = false;
    const probe = () =>
        new Promise<boolean>((resolve) => {
            const s = connect({ host: hostname, port: Number(port) || 80 });
            s.setTimeout(300);
            s.once("connect", () => {
                s.destroy();
                resolve(true);
            });
            s.once("error", () => resolve(false));
            s.once("timeout", () => {
                s.destroy();
                resolve(false);
            });
        });
    return {
        name: "biblio-backend-gate",
        configureServer(server) {
            server.middlewares.use("/api", async (_req, res, next) => {
                // The transcriber is its own service; whether the biblio backend is
                // running says nothing about it. Without this line the table would get
                // a 503 here and conclude that there is no transcriber.
                if ((_req.url || "").startsWith("/transcribe")) return next();
                const now = Date.now();
                if (up === null || now - checked > 3000) {
                    up = await probe();
                    checked = now;
                    if (up && !announced) {
                        announced = true;
                        server.config.logger.info(
                            `[puck-table] biblio-backend op ${API} draait — /api wordt doorgestuurd`,
                        );
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
    // The app itself lives in exe/: index.html, styles/ and public/. The code
    // lives in src/ and is imported from there. Styling is Sass;
    // index.html references styles/main.scss and Vite compiles it.
    root: "exe",
    publicDir: "public",
    // Relative asset paths, so the build also works behind a subpath
    // (http://server:8080/puck/) or directly from file://.
    base: "./",
    plugins: [backendGate()],
    resolve: {
        alias: {
            // One place that determines where the BiblioClient comes from. If you
            // later want to work against the real sturnia-node repo instead of the
            // copy in vendor/, this is the only line that changes.
            "@biblio": fileURLToPath(
                new URL("./vendor/sturnia-node/api/index.ts", import.meta.url),
            ),
        },
    },
    server: {
        host: true,
        // Own port: 5173 is sturnia-node's own dev server (and coco-biblio's
        // `make start`). If those are running at the same time, localhost:5173
        // opens their graph explorer instead of this table.
        // strictPort makes sure we notice that instead of silently shifting
        // to a port you don't expect.
        port: 5174,
        strictPort: true,
        // Leave the "Backend address" field in the app empty: the app then
        // requests api/biblio/... relatively, which goes to coco-biblio here.
        proxy: {
            "/api/transcribe": { target: STT, changeOrigin: true },
            "/api": { target: API, changeOrigin: true },
        },
        // src/ and vendor/ lie outside the root and still need to be served.
        fs: { allow: [fileURLToPath(new URL(".", import.meta.url))] },
    },
    preview: { host: true, port: 8080 },
    // outDir is relative to the root (exe/), hence the `..`. deploy/update.sh
    // builds with `--outDir ../dist.nieuw` to the same place.
    build: { outDir: "../dist", emptyOutDir: true, target: "es2022" },
});
