/* Vitest setup for the participation table.
 *
 *   npm test                   once
 *   npm run test:watch         keeps watching while you work
 *   npm run test:coverage      with a coverage report
 *
 * A separate file from vite.config.ts, and that's deliberate. The
 * dev-server setup there hooks in a plugin that probes the biblio backend
 * every second and intercepts /api; a test that dragged that along would
 * wait on a backend that isn't there. What a test does need is the same
 * `@biblio` alias, since src/kg imports from there. That's below.
 *
 * The smoke test (src/test/smoke.ts) deliberately does NOT run under this:
 * it starts a real Chromium and a real server and needs no test harness. See
 * `npm run smoke`. Vitest only picks up src/test/unit/.
 */
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@biblio": fileURLToPath(
                new URL("./vendor/sturnia-node/api/index.ts", import.meta.url),
            ),
        },
    },
    test: {
        include: ["src/test/unit/**/*.test.ts"],
        // Most of this is computation without a DOM, and nothing in the
        // tree does work at import time that needs one: the state objects
        // in src/state/ read localStorage inside a try and look the
        // canvas up on first use. A test that actually drives the DOM
        // adds its own `// @vitest-environment jsdom` at the top.
        environment: "node",
        globals: false,
        restoreMocks: true,
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/test/**", "src/types/**"],
            reportsDirectory: "coverage",
            reporter: ["text", "html"],
        },
    },
});
