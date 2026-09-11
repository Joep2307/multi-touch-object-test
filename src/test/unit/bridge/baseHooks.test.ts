// @vitest-environment jsdom
/* The recording controls, and what they are pointed at.
 *
 * The frame loop throws the whole parity diagnostic away if it ever
 * raises — the bridge, the parity check, the model — and builds a fresh
 * one on the next frame. The recorder was the one piece the hooks held
 * by value, so after a single caught error the controls stayed bound to
 * a bridge nobody was advancing: every later recording captured that
 * bridge's frozen last frame, thousands of byte-identical copies of it,
 * beside a parity summary reading a counter nobody updates. A recording
 * that replays differently from its session is worse than no recording,
 * which is why this has a test of its own.
 */
import {
    BaseSessionRecorder,
    ParityCheck,
    TrackBridge,
    installBaseHooks,
} from "../../../bridge";
import { afterEach, describe as suite, expect, it } from "vitest";
import type { TrackBridgeContact } from "../../../bridge";
import type { Detection, Template } from "../../../types";

const TPL: Template = {
    id: "ring-1",
    verdict: "good",
    angles: [0, 70, 150, 210, 300],
    ringMM: 34,
};

const FEET = [0, 70, 150, 210, 300];

const contacts = (cx: number, cy: number): TrackBridgeContact[] =>
    FEET.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return {
            sourceId: `pointer:${i}`,
            x: cx + 136 * Math.cos(rad),
            y: cy + 136 * Math.sin(rad),
            radiusPX: 0,
            simulated: false,
        };
    });

const detection = (cx: number, cy: number): Detection => ({
    tpl: TPL,
    conf: 0.9,
    x: cx,
    y: cy,
    angle: 0,
    contactIndices: [0, 1, 2, 3, 4],
    feet: FEET.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return {
            id: i,
            x: cx + 136 * Math.cos(rad),
            y: cy + 136 * Math.sin(rad),
        };
    }),
});

/* One diagnostic's worth of objects, exactly as `frame()` builds them —
   and thrown away together, exactly as `frame()` throws them away. */
const parityRun = (cx: number) => {
    const bridge = new TrackBridge(4);
    const recorder = new BaseSessionRecorder(bridge, new ParityCheck());
    let at = 0;
    return {
        bridge,
        recorder,
        step(): void {
            at += 16;
            bridge.update(at, contacts(cx, 300), [
                {
                    detection: detection(cx, 300),
                    trackId: "puck-1",
                    visible: true,
                },
            ]);
            recorder.capture();
        },
    };
};

afterEach(() => {
    delete window.__base;
});

suite("installBaseHooks", () => {
    it("records through whichever recorder is current", () => {
        let run = parityRun(400);
        installBaseHooks(
            () => run.recorder,
            () => null,
        );
        const hooks = window.__base;
        if (hooks === undefined) throw new Error("hooks not installed");

        hooks.start("first");
        for (let i = 0; i < 5; i += 1) run.step();
        expect(hooks.frames).toBe(5);

        /* What the catch in `frame()` does: everything goes, and the
           next frame builds a new set. The controls were installed once
           and are never installed again. */
        run = parityRun(700);
        expect(hooks.recording).toBe(false);
        expect(hooks.frames).toBe(0);

        hooks.start("second");
        for (let i = 0; i < 3; i += 1) run.step();
        expect(hooks.frames).toBe(3);

        /* And what it captured is the *new* bridge. Before this, the
           controls held the first recorder and went on capturing a
           bridge nobody was advancing — the same frozen frame over and
           over, from a puck that had stopped being measured. */
        const saved = run.recorder.toJSON("2026-09-11T00:00:00.000Z");
        const parsed = JSON.parse(saved ?? "") as {
            frames: { points: { x: number }[] }[];
        };
        const first = parsed.frames[0]?.points[0];
        expect(first?.x).toBeCloseTo(700 + 136, 6);
    });

    it("says so rather than throwing when there is no recorder", () => {
        /* Between the failure and the next frame there is none. A
           control that threw here would take the page down for the one
           reason the whole diagnostic is wrapped in a catch. */
        installBaseHooks(
            () => null,
            () => null,
        );
        const hooks = window.__base;
        if (hooks === undefined) throw new Error("hooks not installed");
        expect(hooks.recording).toBe(false);
        expect(hooks.frames).toBe(0);
        expect(hooks.start()).toBe("recorder: stopped");
        expect(hooks.stop()).toBe("recorder: stopped");
        expect(hooks.save()).toBe("recorder: stopped");
        expect(hooks.parity()).toBe("recorder: stopped");
    });
});
