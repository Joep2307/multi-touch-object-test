/* Move, Rotate and Tap: the traits that need more than one frame.
 *
 * Everything here is driven a frame at a time with an explicit clock,
 * because that is the only way to test something whose whole job is
 * remembering what the last frame said.
 */
import { describe, expect, it } from "vitest";
import {
    ApexHeadingSource,
    CentroidSolver,
    footprintFrom,
    Direction,
    DirectionPolicy,
    Move,
    MovePolicy,
    Position,
    PositionPolicy,
    Rotate,
    HeadingRotationSource,
    RotatePolicy,
    Tap,
    shortestAngleDiffDeg,
} from "../../../core/base";
import type { SensedContact } from "../../../core/contact";
import type { FootprintSpec } from "../../../core/base";

const TRIAD_FEET = [0, 132, 228].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: 40 * Math.cos(rad), y: 40 * Math.sin(rad) };
});
const SPEC: FootprintSpec = footprintFrom(
    TRIAD_FEET,
    80,
    new CentroidSolver(),
);

const feet = (
    cx: number,
    cy: number,
    rot: number,
    at: number,
    firstSeen = 0,
): SensedContact[] =>
    [0, 132, 228].map((off, i) => {
        const rad = ((rot + off) * Math.PI) / 180;
        return {
            id: i,
            x: cx + 160 * Math.cos(rad),
            y: cy + 160 * Math.sin(rad),
            radiusPX: 9,
            firstSeen,
            lastSeen: at,
        };
    });

type Rig = {
    step: (points: readonly SensedContact[], at: number) => void;
    position: Position;
    direction: Direction;
    move: Move;
    rotate: Rotate;
    tap: Tap;
};

const rig = (): Rig => {
    const position = new Position(new CentroidSolver(), new PositionPolicy());
    const direction = new Direction(
        position,
        new ApexHeadingSource(new DirectionPolicy()),
    );
    const move = new Move(position, new MovePolicy());
    const rotate = new Rotate(
        new HeadingRotationSource(direction, new RotatePolicy()),
        new RotatePolicy(),
        direction,
    );
    const tap = new Tap(position);
    return {
        position,
        direction,
        move,
        rotate,
        tap,
        step(points, at) {
            const sample = {
                at,
                contacts: { at, points },
                spec: SPEC,
                pxPerMM: 4,
            };
            position.update(sample);
            direction.update(sample);
            move.update(sample);
            rotate.update(sample);
            tap.update(sample);
        },
    };
};

describe("shortestAngleDiffDeg", () => {
    it("takes the short way across the wrap point", () => {
        expect(shortestAngleDiffDeg(350, 10)).toBeCloseTo(20, 9);
        expect(shortestAngleDiffDeg(10, 350)).toBeCloseTo(-20, 9);
    });

    it("stays within half a turn", () => {
        expect(shortestAngleDiffDeg(0, 179)).toBeCloseTo(179, 9);
        expect(shortestAngleDiffDeg(0, 181)).toBeCloseTo(-179, 9);
    });
});

describe("Move", () => {
    it("reports still while the object rests", () => {
        const r = rig();
        for (let f = 0; f < 20; f += 1)
            r.step(feet(400, 300, 0, f * 16), f * 16);
        expect(r.move.snapshot().moving).toBe(false);
        expect(r.move.snapshot().travelledPX).toBe(0);
    });

    it("follows a drag and accumulates the path", () => {
        const r = rig();
        for (let f = 0; f < 40; f += 1) {
            r.step(feet(400 + f * 5, 300, 0, f * 16), f * 16);
        }
        const s = r.move.snapshot();
        expect(s.moving).toBe(true);
        expect(s.deltaTotal.x).toBeGreaterThan(150);
        expect(s.travelledPX).toBeGreaterThan(150);
        expect(s.to?.y).toBeCloseTo(300, 3);
    });

    it("forgets everything when the object leaves the glass", () => {
        const r = rig();
        for (let f = 0; f < 20; f += 1) {
            r.step(feet(400 + f * 5, 300, 0, f * 16), f * 16);
        }
        r.step([], 20 * 16);
        expect(r.move.snapshot().to).toBeNull();
        expect(r.move.snapshot().travelledPX).toBe(0);
    });
});

describe("Rotate", () => {
    it("adds up a full turn instead of wrapping to zero", () => {
        const r = rig();
        for (let f = 0; f <= 72; f += 1) {
            r.step(feet(400, 300, f * 5, f * 16), f * 16);
        }
        const s = r.rotate.snapshot();
        expect(s.deltaTotalDeg).toBeCloseTo(360, 0);
        expect(s.turns).toBe(1);
    });

    it("subtracts when the object turns back", () => {
        const r = rig();
        for (let f = 0; f <= 20; f += 1) {
            r.step(feet(400, 300, f * 3, f * 16), f * 16);
        }
        for (let f = 21; f <= 40; f += 1) {
            r.step(feet(400, 300, (40 - f) * 3, f * 16), f * 16);
        }
        expect(r.rotate.snapshot().deltaTotalDeg).toBeCloseTo(0, 0);
    });

    it("ignores a jump too large to be a real turn", () => {
        const r = rig();
        r.step(feet(400, 300, 0, 0), 0);
        r.step(feet(400, 300, 3, 16), 16);
        const before = r.rotate.snapshot().deltaTotalDeg;
        r.step(feet(400, 300, 130, 32), 32);
        expect(r.rotate.snapshot().deltaTotalDeg).toBeCloseTo(before, 9);
    });

    it("re-baselines when the heading has genuinely moved", () => {
        /* Rejecting a large step protects the total from one bad
           frame. Holding that rejection forever kills rotation: pick
           a puck up, turn it in your hand, put it back, and every
           frame after that is a large step. It must recover. */
        const r = rig();
        for (let f = 0; f <= 10; f += 1) {
            r.step(feet(400, 300, f * 2, f * 16), f * 16);
        }
        const before = r.rotate.snapshot().deltaTotalDeg;
        for (let f = 11; f < 60; f += 1) {
            r.step(feet(400, 300, f * 2 + 130, f * 16), f * 16);
        }
        expect(r.rotate.snapshot().deltaTotalDeg).toBeGreaterThan(before + 20);
    });

    it("still ignores a single glitch frame", () => {
        const r = rig();
        r.step(feet(400, 300, 0, 0), 0);
        r.step(feet(400, 300, 3, 16), 16);
        const before = r.rotate.snapshot().deltaTotalDeg;
        r.step(feet(400, 300, 133, 32), 32);
        expect(r.rotate.snapshot().deltaTotalDeg).toBeCloseTo(before, 9);
    });

    it("pauses rather than spinning when the heading is unknown", () => {
        const r = rig();
        for (let f = 0; f <= 10; f += 1) {
            r.step(feet(400, 300, f * 2, f * 16), f * 16);
        }
        const before = r.rotate.snapshot().deltaTotalDeg;
        /* An equilateral footprint has no nose, so Direction goes
           unknown while keeping its last good heading. */
        const even: SensedContact[] = [0, 120, 240].map((off, i) => ({
            id: i,
            x: 400 + 160 * Math.cos((off * Math.PI) / 180),
            y: 300 + 160 * Math.sin((off * Math.PI) / 180),
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: 200,
        }));
        r.step(even, 200);
        expect(r.direction.snapshot().known).toBe(false);
        expect(r.rotate.snapshot().deltaTotalDeg).toBeCloseTo(before, 9);
    });
});

describe("Tap", () => {
    it("reports the live dwell while the object is down", () => {
        const r = rig();
        r.step(feet(400, 300, 0, 0, 0), 0);
        r.step(feet(400, 300, 0, 120, 0), 120);
        expect(r.tap.snapshot().down).toBe(true);
        expect(r.tap.snapshot().dwellMS).toBe(120);
    });

    it("keeps the finished episode on the frame it is released", () => {
        const r = rig();
        r.step(feet(400, 300, 0, 0, 0), 0);
        r.step(feet(400, 300, 0, 120, 0), 120);
        r.step([], 140);
        const snapshot = r.tap.snapshot();
        expect(snapshot.down).toBe(false);
        expect(snapshot.dwellMS).toBe(140);
    });

    it("measures how far the centre wandered while it was down", () => {
        const r = rig();
        r.step(feet(400, 300, 0, 0, 0), 0);
        r.step(feet(500, 300, 0, 120, 0), 120);
        r.step([], 140);
        expect(r.tap.snapshot().movedPX).toBeGreaterThan(0);
    });

    it("survives a foot flickering during a long hold", () => {
        /* The interval comes from the contacts' own firstSeen, not
           from a timer this trait starts, so losing a foot in the
           middle of a hold does not restart the clock. */
        const r = rig();
        r.step(feet(400, 300, 0, 0, 0), 0);
        r.step(feet(400, 300, 0, 400, 0).slice(0, 2), 400);
        r.step(feet(400, 300, 0, 800, 0), 800);
        r.step([], 820);
        expect(r.tap.snapshot().dwellMS).toBe(820);
    });
});
