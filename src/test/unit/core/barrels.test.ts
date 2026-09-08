/* Every barrel under src/core/ has to import without throwing.
 *
 * This is the cheapest test in the repo and the one most likely to
 * catch a real problem: a circular import between two barrels, a file
 * renamed without its export, a module that does work at import time
 * instead of when it is called. All three show up here as a thrown
 * error rather than as a black table on the afternoon.
 *
 * Add a line here for every new folder under src/core/.
 */
import { describe, expect, it } from "vitest";

describe("src/core barrels", () => {
    it("imports the root barrel", async () => {
        const mod = await import("../../../core/index");
        expect(Object.keys(mod).length).toBeGreaterThan(0);
    });

    it("imports the contact barrel and exposes its classes", async () => {
        const mod = await import("../../../core/contact/index");
        expect(typeof mod.ContactSource).toBe("function");
        expect(typeof mod.PointerContactSource).toBe("function");
        expect(typeof mod.SimulatedContactSource).toBe("function");
        expect(typeof mod.ReplayContactSource).toBe("function");
        expect(typeof mod.ContactRecorder).toBe("function");
    });

    it("does no work at import time", async () => {
        const before = Date.now();
        await import("../../../core/index");
        expect(Date.now() - before).toBeLessThan(500);
    });
});
