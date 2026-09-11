/* How far a puck turned, and why the answer changed.
 *
 * The table said this plainly on 9 September 2026: a puck turned
 * through a full circle read as 97 to 203 degrees, at every
 * combination of threshold tried, because the standard three-foot
 * footprint has no nose worth the name. Its apex asymmetry measures
 * about 6% against a measurement noise of about 1.6%, so the apex hops
 * between feet, and each hop is either rejected — losing the rotation
 * under it — or accepted as a false turn.
 *
 * The last test in this file is the one that matters. It replays the
 * real recording of that full circle.
 */
import { describe, expect, it } from "vitest";
import {
    PointMatchRotationSource,
    RotatePolicy,
    Rotate,
} from "../../../core/base";
import type { BaseSample, FootprintSpec } from "../../../core/base";
import type { ContactRecording, SensedContact } from "../../../core/contact";
import fullTurn from "./fixtures/contacts-table-44-43582.json";

const recording = fullTurn as ContactRecording;

/* One frame at sixty hertz. */
const FRAME_MS = 16;

const SPEC: FootprintSpec = {
    expectedCount: 3,
    footRadiusMM: 34.6,
    footRadiusSpreadMM: 0.95,
    outerDiameterMM: 80,
};

const sample = (points: readonly SensedContact[], at: number): BaseSample => ({
    at,
    contacts: { at, points },
    spec: SPEC,
    pxPerMM: 2.02,
});

/* Three feet on a ring, turned by `deg`. Deliberately equilateral:
   the whole point is that this works with no distinguishable nose. */
const feet = (deg: number, at: number): readonly SensedContact[] =>
    [0, 120, 240].map((off, i) => {
        const rad = ((deg + off) * Math.PI) / 180;
        return {
            id: i,
            x: 400 + 70 * Math.cos(rad),
            y: 300 + 70 * Math.sin(rad),
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: at,
        };
    });

describe("PointMatchRotationSource", () => {
    const source = (): PointMatchRotationSource =>
        new PointMatchRotationSource(new RotatePolicy());

    it("says nothing about the first frame it sees", () => {
        expect(source().step(sample(feet(0, 0), 0))).toBeNull();
    });

    it("reads a turn with no distinguishable nose at all", () => {
        /* An equilateral footprint has no apex. That is exactly the
           case the heading approach cannot answer and this one does
           not need to. */
        const s = source();
        s.step(sample(feet(0, 0), 0));
        expect(s.step(sample(feet(10, 16), 16))).toBeCloseTo(10, 6);
    });

    it("signs the turn, so turning back subtracts", () => {
        const s = source();
        s.step(sample(feet(0, 0), 0));
        expect(s.step(sample(feet(-7, 16), 16))).toBeCloseTo(-7, 6);
    });

    it("ignores a move that is not a turn", () => {
        const s = source();
        s.step(sample(feet(0, 0), 0));
        const slid = feet(0, 16).map((p) => ({ ...p, x: p.x + 120 }));
        expect(s.step(sample(slid, 16))).toBeCloseTo(0, 6);
    });

    it("needs two feet it saw last frame, and says so", () => {
        const s = source();
        s.step(sample(feet(0, 0), 0));
        const one = feet(10, 16).slice(0, 1);
        expect(s.step(sample(one, 16))).toBeNull();
    });

    it("uses only the feet present in both frames", () => {
        /* A foot that dropped out and came back has a new contact id,
           so it is ignored rather than matched to whichever foot
           happens to be nearest. */
        const s = source();
        s.step(sample(feet(0, 0), 0));
        const twoOfThree = feet(12, 16).slice(0, 2);
        expect(s.step(sample(twoOfThree, 16))).toBeCloseTo(12, 6);
    });

    it("refuses a step no hand could make between two frames", () => {
        /* Two feet swapping ids, or a second object's feet arriving
           under the same ones. Not a turn. */
        const s = source();
        s.step(sample(feet(0, 0), 0));
        expect(s.step(sample(feet(120, 16), 16))).toBeNull();
    });

    it("forgets everything on reset", () => {
        const s = source();
        s.step(sample(feet(0, 0), 0));
        s.reset();
        expect(s.step(sample(feet(10, 16), 16))).toBeNull();
    });
});

describe("Rotate, driven by point matching", () => {
    const rig = (): Rotate =>
        new Rotate(
            new PointMatchRotationSource(new RotatePolicy()),
            new RotatePolicy(),
        );

    it("accumulates a full synthetic turn to 360", () => {
        const rotate = rig();
        /* At a real frame rate. Sixteen milliseconds a frame, not the
           eighty this test used to imply — a source that refuses to
           match across a gap is right to refuse an eighty-millisecond
           one, because at the table that is a puck that was lifted. */
        let at = 0;
        for (let step = 0; step <= 360; step += 5) {
            rotate.update(sample(feet(step, at), at));
            at += FRAME_MS;
        }
        expect(rotate.snapshot().deltaTotalDeg).toBeCloseTo(360, 3);
    });

    it("counts a completed turn once it is past the post", () => {
        /* `turns` truncates, so a total that lands a fraction under
           360 is not yet a turn. That is the right answer and it is
           knife-edge by nature, so the test asks the question a little
           past the line rather than exactly on it. */
        const rotate = rig();
        let at = 0;
        for (let step = 0; step <= 400; step += 5) {
            rotate.update(sample(feet(step, at), at));
            at += FRAME_MS;
        }
        expect(rotate.snapshot().turns).toBe(1);
    });

    it("refuses to match across a gap in time", () => {
        /* A puck lifted and put back has not turned in the meantime,
           however far its feet appear to have moved. */
        const s = new PointMatchRotationSource(new RotatePolicy());
        s.step(sample(feet(0, 0), 0));
        expect(s.step(sample(feet(10, 2000), 2000))).toBeNull();
    });

    it("pauses rather than resets when the feet go away", () => {
        /* A puck that loses a foot mid-turn picks the turn up where it
           left off. A source returning null is a pause, not a zero. */
        const rotate = rig();
        rotate.update(sample(feet(0, 0), 0));
        rotate.update(sample(feet(30, 16), 16));
        const half = rotate.snapshot().deltaTotalDeg;
        rotate.update(sample([], 32));
        expect(rotate.snapshot().deltaTotalDeg).toBe(half);
        expect(rotate.snapshot().turning).toBe(false);
    });

    it("counts a turn too slow to trip the dead zone", () => {
        /* 0.3 degrees a frame for three hundred frames: a real
           90-degree turn over five seconds, and every single step
           inside the 0.4-degree dead zone. Adding only the steps that
           beat the dead zone reported zero, so a puck turned slowly
           never turned at all. */
        const rotate = rig();
        let at = 0;
        for (let f = 0; f <= 300; f += 1) {
            rotate.update(sample(feet(f * 0.3, at), at));
            at += FRAME_MS;
        }
        expect(rotate.snapshot().deltaTotalDeg).toBeCloseTo(90, 3);
        /* And it is still not *turning*: that is this frame's
           question, and the dead zone is the right answer to it. */
        expect(rotate.snapshot().turning).toBe(false);
        expect(rotate.snapshot().deltaFrameDeg).toBe(0);
    });

    it("does not wander when a still puck is only noisy", () => {
        /* The other half of accumulating every step. Measurement noise
           is zero-mean, so summing it goes nowhere — which is what
           makes the dead zone unnecessary for the total. */
        const rotate = rig();
        let at = 0;
        for (let f = 0; f <= 300; f += 1) {
            /* Deterministic, so a failure is reproducible: ±0.3
               degrees alternating, which is the amplitude measured on
               a puck lying still. */
            rotate.update(sample(feet(f % 2 === 0 ? 0.3 : -0.3, at), at));
            at += FRAME_MS;
        }
        expect(Math.abs(rotate.snapshot().deltaTotalDeg)).toBeLessThan(2);
    });

    it("reads the real full circle as a full circle", () => {
        /* The measurement that changed the design. This is the
           recording made at the table on 9 September 2026 of a puck
           turned through one complete revolution. Read as a change of
           heading it came out between 97 and 203 degrees. */
        const rotate = rig();
        for (const frame of recording.frames) {
            const points = frame.points.filter((p) => p.status !== "ended");
            rotate.update(sample(points, frame.at));
        }
        const turned = Math.abs(rotate.snapshot().deltaTotalDeg);
        expect(turned).toBeGreaterThan(330);
        expect(turned).toBeLessThan(375);
    });
});
