/* Holding on to a puck that is briefly not there.
 *
 * The old tracker's one job across frames: a puck that drops out is
 * almost never being removed — one bad contact, a bump, a sleeve over
 * the glass — so it stays for `CFG.dropoutMS` and only then goes into
 * `tracks.memory`, where it keeps its marker and its topic for whoever
 * picks it up again.
 *
 * That was regressed by the module split: the final `else` in `track()`
 * deleted anything not `recognised`, which includes the `incomplete`
 * state the hold had just moved the puck into. One frame instead of
 * nine hundred milliseconds, and gone without reaching memory. The
 * tests below are the ones that would have caught it.
 */
import { afterEach, beforeEach, describe as suite, expect, it } from "vitest";
import { CFG } from "../../config/CFG";
import { tracks } from "../../state/tracks";
import { track } from "../../puck/track";
import type { Detection } from "../../types/Detection";
import type { Template } from "../../types/Template";

const TPL: Template = {
    id: "puck-01",
    verdict: "good",
    ratios: [0.62, 0.81],
    longestMM: 60,
};

const FRAME_MS = 16;

const detection = (x: number, y: number): Detection => ({
    tpl: TPL,
    conf: 0.9,
    x,
    y,
    angle: 0,
    contactIndices: [0, 1, 2],
});

/* Seen on enough consecutive frames to leave `candidate`. Returns the
   time of the last frame, so a test can carry on counting from it. */
const settle = (from = 0): number => {
    let at = from;
    for (let i = 0; i < CFG.stableFrames; i += 1) {
        track([detection(100, 100)], at);
        at += FRAME_MS;
    }
    return at;
};

const only = () => {
    const [first] = [...tracks.map.values()];
    return first;
};

beforeEach(() => {
    tracks.map.clear();
    tracks.memory.length = 0;
    tracks.seq = 0;
});

afterEach(() => {
    tracks.map.clear();
    tracks.memory.length = 0;
    tracks.seq = 0;
});

suite("track", () => {
    it("holds a recognised puck through ten unseen frames", () => {
        let at = settle();
        expect(only()?.state).toBe("recognised");
        for (let i = 0; i < 10; i += 1) {
            track([], at);
            at += FRAME_MS;
        }
        expect(tracks.map.size).toBe(1);
        expect(only()?.state).toBe("incomplete");
        /* And nothing has been filed away yet: the puck is still on the
           table as far as everything above is concerned. */
        expect(tracks.memory).toHaveLength(0);
    });

    it("files a puck away once it has been gone longer than dropoutMS", () => {
        const at = settle();
        track([], at + CFG.dropoutMS + FRAME_MS);
        expect(tracks.map.size).toBe(0);
        expect(tracks.memory).toHaveLength(1);
        expect(tracks.memory[0]?.tplId).toBe(TPL.id);
    });

    it("drops a candidate the moment it is not seen", () => {
        track([detection(100, 100)], 0);
        expect(only()?.state).toBe("candidate");
        track([], FRAME_MS);
        expect(tracks.map.size).toBe(0);
        /* A candidate was never a puck, so there is nothing about it
           worth remembering. */
        expect(tracks.memory).toHaveLength(0);
    });

    it("picks a held puck back up where it left off", () => {
        let at = settle();
        for (let i = 0; i < 10; i += 1) {
            track([], at);
            at += FRAME_MS;
        }
        const id = only()?.id;
        track([detection(100, 100)], at);
        expect(tracks.map.size).toBe(1);
        /* The same track, not a new one — which is the whole point of
           holding on to it. */
        expect(only()?.id).toBe(id);
        expect(only()?.state).toBe("recognised");
    });
});
