/* Every barrel in the app tree has to import under Node, on its own.
 *
 * The twin of core/barrels.test.ts, with one difference that is the
 * whole point: each barrel is imported first, in a fresh module graph.
 * A barrel that only loads because something else happened to be
 * evaluated before it — a class whose base came through a cycle, a
 * constant read before its module ran — passes when the app boots in
 * its usual order and fails on the first test that imports it alone.
 * A fresh graph per barrel finds that regardless of order.
 *
 * Under Node there is no page. So this also proves that nothing in
 * the tree needs a browser to *load*: the canvas is looked up lazily,
 * storage is read behind a try, matchMedia is asked for before it is
 * called. Only src/main.ts does work when it loads, and it is not a
 * barrel.
 *
 * Add a line to BARRELS for every new folder under src/.
 */
import { describe, expect, it, vi } from "vitest";

const BARRELS: Record<string, () => Promise<object>> = {
    boot: () => import("../../boot/index"),
    capture: () => import("../../capture/index"),
    config: () => import("../../config/index"),
    dom: () => import("../../dom/index"),
    i18n: () => import("../../i18n/index"),
    input: () => import("../../input/index"),
    kg: () => import("../../kg/index"),
    map: () => import("../../map/index"),
    notes: () => import("../../notes/index"),
    pins: () => import("../../pins/index"),
    puck: () => import("../../puck/index"),
    "puck/geometry": () => import("../../puck/geometry/index"),
    "puck/learn": () => import("../../puck/learn/index"),
    "puck/noise": () => import("../../puck/noise/index"),
    "puck/ring": () => import("../../puck/ring/index"),
    "puck/scale": () => import("../../puck/scale/index"),
    "puck/sim": () => import("../../puck/sim/index"),
    "puck/tray": () => import("../../puck/tray/index"),
    render: () => import("../../render/index"),
    speech: () => import("../../speech/index"),
    state: () => import("../../state/index"),
    talk: () => import("../../talk/index"),
    types: () => import("../../types/index"),
    ui: () => import("../../ui/index"),
    "ui/analytics": () => import("../../ui/analytics/index"),
    "ui/keyboard": () => import("../../ui/keyboard/index"),
    "ui/kgInfo": () => import("../../ui/kgInfo/index"),
    "ui/menu": () => import("../../ui/menu/index"),
    "ui/panels": () => import("../../ui/panels/index"),
    "ui/resetKey": () => import("../../ui/resetKey/index"),
};

describe("app-tree barrels", () => {
    for (const [name, load] of Object.entries(BARRELS)) {
        it(`imports src/${name} first, in a fresh graph`, async () => {
            vi.resetModules();
            const mod = await load();
            /* `types` is nothing but types and is empty at runtime;
               every other barrel has something to show. */
            if (name !== "types") {
                expect(Object.keys(mod).length).toBeGreaterThan(0);
            }
        });
    }

    it("does no work at import time", async () => {
        /* By now every file has been transformed once, so what is
           measured is evaluation, not compilation. */
        vi.resetModules();
        const before = Date.now();
        await BARRELS.puck?.();
        await BARRELS.ui?.();
        await BARRELS.render?.();
        expect(Date.now() - before).toBeLessThan(500);
    });
});
