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

    it("imports the gesture barrel and exposes its recogniser", async () => {
        const mod = await import("../../../core/gesture/index");
        expect(typeof mod.GestureRecogniser).toBe("function");
        expect(typeof mod.defaultGestureDefinitions).toBe("function");
    });

    it("imports the event and relation barrels", async () => {
        const events = await import("../../../core/events/index");
        expect(typeof events.EventBus).toBe("function");
        const relation = await import("../../../core/relation/index");
        expect(typeof relation.SpatialIndex).toBe("function");
    });

    it("imports the behaviour barrel and exposes its engine", async () => {
        const mod = await import("../../../core/behaviour/index");
        expect(typeof mod.RuleEngine).toBe("function");
        expect(typeof mod.StateMachineRunner).toBe("function");
        expect(typeof mod.TimerWheel).toBe("function");
    });

    it("imports the session barrel and exposes its session", async () => {
        const mod = await import("../../../core/session/index");
        expect(typeof mod.Session).toBe("function");
        expect(typeof mod.RoleAssigner).toBe("function");
        expect(typeof mod.EventLog).toBe("function");
    });

    it("imports the presentation barrel", async () => {
        const mod = await import("../../../core/presentation/index");
        expect(typeof mod.RegionTracker).toBe("function");
        expect(typeof mod.buildRenderPlan).toBe("function");
    });

    it("imports the programme barrel", async () => {
        const mod = await import("../../../core/programme/index");
        expect(typeof mod.ProgrammeLoader).toBe("function");
        expect(typeof mod.validateProgramme).toBe("function");
    });

    it("imports the runtime barrel", async () => {
        const mod = await import("../../../core/runtime/index");
        expect(typeof mod.Runtime).toBe("function");
    });

    it("does no work at import time", async () => {
        const before = Date.now();
        await import("../../../core/index");
        expect(Date.now() - before).toBeLessThan(500);
    });
});
