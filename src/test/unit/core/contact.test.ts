/* The contact layer: what the model is fed, and how a recorded session
   comes back.
 *
 * The replay tests matter more than they look. Everything from phase 2
 * on is checked by replaying a recording and asserting on what the
 * traits made of it, so if replay itself drifts, every test above it
 * quietly starts lying.
 */
import { describe, expect, it } from "vitest";
import {
    ContactRecorder,
    PointerContactSource,
    ReplayContactSource,
    SIM_CONTACT_ID_BLOCK,
    SimulatedContactSource,
} from "../../../core/contact";
import type { ContactRecording } from "../../../core/contact";
import fixture from "./fixtures/threePointPlaceRotateLift.json";

const recording = fixture as ContactRecording;

describe("PointerContactSource", () => {
    it("reports what is down, sorted by id", () => {
        const src = new PointerContactSource();
        src.down(7, 10, 20, 4, 100);
        src.down(3, 30, 40, 4, 100);
        const frame = src.frame(116);
        expect(frame.at).toBe(116);
        expect(frame.points.map((p) => p.id)).toEqual([3, 7]);
    });

    it("keeps firstSeen across a move, so dwell survives", () => {
        const src = new PointerContactSource();
        src.down(1, 0, 0, 4, 100);
        src.move(1, 5, 5, 4, 400);
        const point = src.frame(400).points[0];
        expect(point?.firstSeen).toBe(100);
        expect(point?.lastSeen).toBe(400);
        expect(point?.x).toBe(5);
    });

    it("treats a move on an unknown id as a down", () => {
        const src = new PointerContactSource();
        src.move(9, 1, 2, 4, 250);
        expect(src.frame(250).points[0]?.firstSeen).toBe(250);
    });

    it("forgets everything on clear, so a reset cannot strand a foot", () => {
        const src = new PointerContactSource();
        src.down(1, 0, 0, 4, 0);
        src.clear();
        expect(src.frame(10).points).toHaveLength(0);
    });
});

describe("SimulatedContactSource", () => {
    it("gives each copy its own id block", () => {
        const src = new SimulatedContactSource();
        const feet = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 10 },
        ];
        src.setCopy(1, feet, 9, 0);
        src.setCopy(2, feet, 9, 0);
        const ids = src.frame(0).points.map((p) => p.id);
        expect(new Set(ids).size).toBe(6);
        expect(ids.some((id) => id >= 2 * SIM_CONTACT_ID_BLOCK)).toBe(true);
    });

    it("keeps firstSeen when a copy is dragged", () => {
        const src = new SimulatedContactSource();
        src.setCopy(1, [{ x: 0, y: 0 }], 9, 100);
        src.setCopy(1, [{ x: 40, y: 0 }], 9, 300);
        const point = src.frame(300).points[0];
        expect(point?.firstSeen).toBe(100);
        expect(point?.x).toBe(40);
    });
});

describe("ContactRecorder", () => {
    it("captures frames and stamps the version", () => {
        const src = new PointerContactSource();
        const rec = new ContactRecorder("test");
        src.down(1, 0, 0, 4, 0);
        for (let at = 0; at < 3; at += 1) rec.add(src.frame(at));
        const out = rec.finish("2026-09-08T00:00:00.000Z");
        expect(out.frames).toHaveLength(3);
        expect(out.version).toBe(1);
        expect(out.name).toBe("test");
    });

    it("stops at the cap and says how much it dropped", () => {
        const src = new PointerContactSource();
        const rec = new ContactRecorder("small", 2);
        for (let at = 0; at < 5; at += 1) rec.add(src.frame(at));
        expect(rec.frameCount).toBe(2);
        expect(rec.droppedCount).toBe(3);
    });
});

describe("ReplayContactSource", () => {
    it("refuses a recording it cannot read", () => {
        const wrong = { ...recording, version: 99 };
        expect(
            () =>
                new ReplayContactSource(wrong as unknown as ContactRecording),
        ).toThrow(/version/);
    });

    it("pins the recording's clock to the caller's first call", () => {
        const src = new ReplayContactSource(recording);
        const first = src.frame(5000);
        expect(first.at).toBe(5000);
        expect(first.points).toHaveLength(0);
    });

    it("replays the puck appearing and being lifted", () => {
        const src = new ReplayContactSource(recording);
        src.frame(0);
        expect(src.frame(5 * 16).points).toHaveLength(3);
        expect(src.frame(30 * 16).points).toHaveLength(3);
        expect(src.frame(59 * 16).points).toHaveLength(0);
        expect(src.done).toBe(true);
    });

    it("never rewinds when the caller's clock jumps forward", () => {
        const src = new ReplayContactSource(recording);
        src.frame(0);
        src.frame(40 * 16);
        expect(src.frame(41 * 16).points).toHaveLength(3);
    });

    it("hands out one clock, not two", () => {
        /* The frame carries the caller's `now`; every contact on it
           must be on that same clock. A frame with the caller's `at`
           and the recording's `firstSeen` made Tap report an instant
           hold on the first frame of a replay. */
        const src = new ReplayContactSource(recording);
        src.frame(5000);
        const frame = src.frame(5000 + 30 * 16);
        for (const point of frame.points) {
            expect(point.firstSeen).toBeLessThanOrEqual(frame.at);
            expect(frame.at - point.firstSeen).toBeLessThan(2000);
        }
    });

    it("round-trips a recording it just made", () => {
        const live = new PointerContactSource();
        const rec = new ContactRecorder("round-trip");
        live.down(1, 100, 100, 5, 0);
        for (let f = 0; f < 10; f += 1) {
            live.move(1, 100 + f, 100, 5, f * 16);
            rec.add(live.frame(f * 16));
        }
        const replay = new ReplayContactSource(
            rec.finish("2026-09-08T00:00:00.000Z"),
        );
        replay.frame(0);
        expect(replay.frame(9 * 16).points[0]?.x).toBe(109);
    });
});
