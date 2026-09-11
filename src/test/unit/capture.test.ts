// @vitest-environment jsdom
/* Stopping a capture when the session it belongs to is thrown away.
 *
 * `cancelCapture` existed from the first version of the capture module
 * and was never called — not in the module split, and not in the
 * single-file table before it. So a recording begun at two o'clock kept
 * running through "clear everything" and delivered, a quarter of an hour
 * later, a film of a session nobody could place any more. The function
 * always said what it was for ("when a session is wiped or reset,
 * nothing may keep running"); what was missing was the call.
 *
 * Stopping is deliberately not discarding: the recorder hands over what
 * it has. A wipe at the end of an afternoon should not cost the film.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelCapture } from "../../capture";
import { capture } from "../../state";
import type { Lapse } from "../../types";

const runningLapse = (): Lapse => ({
    timer: setInterval(() => {}, 1000),
    tick: setInterval(() => {}, 1000),
    frames: [],
    bytes: 0,
    start: Date.now(),
});

beforeEach(() => {
    capture.rec = null;
    capture.lapse = null;
    capture.recTimer = null;
    capture.busy = false;
    capture.events = {};
});

describe("cancelCapture", () => {
    it("stops a running time-lapse and forgets it", () => {
        const clear = vi.spyOn(globalThis, "clearInterval");
        const lapse = runningLapse();
        capture.lapse = lapse;

        cancelCapture();

        expect(capture.lapse).toBeNull();
        expect(clear).toHaveBeenCalledWith(lapse.timer);
        expect(clear).toHaveBeenCalledWith(lapse.tick);
    });

    it("tells the buttons, so the clock stops counting", () => {
        const change = vi.fn();
        capture.events = { change };
        capture.lapse = runningLapse();

        cancelCapture();

        expect(change).toHaveBeenCalled();
    });

    it("asks a running recorder to stop, rather than dropping it", () => {
        const stop = vi.fn();
        /* Only the two fields `cancelCapture` reaches for. A real
           MediaRecorder needs a canvas stream, which jsdom has not got. */
        capture.rec = { stop } as unknown as MediaRecorder;

        cancelCapture();

        expect(stop).toHaveBeenCalled();
    });

    it("does nothing when nothing is running", () => {
        const change = vi.fn();
        capture.events = { change };

        expect(() => cancelCapture()).not.toThrow();
        expect(change).not.toHaveBeenCalled();
    });
});

describe("clearing everything", () => {
    it("stops the capture that belonged to the session", async () => {
        document.body.innerHTML = '<button id="btnWipe"></button>';
        const { onWipe } = await import("../../ui");
        const { wipe } = await import("../../state");
        const lapse = runningLapse();
        capture.lapse = lapse;

        /* The first tap only arms the button; the second one within four
           seconds is the one that wipes. */
        onWipe();
        expect(capture.lapse).toBe(lapse);
        onWipe();

        expect(capture.lapse).toBeNull();
        wipe.armedAt = 0;
    });
});
