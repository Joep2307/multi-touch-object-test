/* The base traits: where an object is, and which way it points.
 *
 * The numbers here are chosen so the right answer can be worked out by
 * hand — feet on a circle of radius 160 px at a scale of 4 px/mm, so
 * 40 mm from the centre — because a test whose expected value came out
 * of the code it is testing proves nothing.
 */
import { describe, expect, it } from "vitest";
import {
    Acceleration,
    AccelerationPolicy,
    ApexHeadingSource,
    Base,
    CentroidSolver,
    CircleFitSolver,
    Direction,
    footprintFrom,
    DirectionPolicy,
    DirectionRay,
    GapHeadingSource,
    Move,
    MovePolicy,
    Position,
    PositionPolicy,
    PxPerMMEstimator,
    PxPerMMPolicy,
    Rotate,
    RotatePolicy,
    Tail,
    TailPolicy,
    Tap,
    TapPolicy,
} from "../../../core/base";
import { ReplayContactSource } from "../../../core/contact";
import type { ContactPoint, ContactRecording } from "../../../core/contact";
import type { FootprintSpec } from "../../../core/base";
import fixture from "./fixtures/threePointPlaceRotateLift.json";

const recording = fixture as ContactRecording;

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
    r: number,
    degs: readonly number[],
): ContactPoint[] =>
    degs.map((d, i) => {
        const rad = (d * Math.PI) / 180;
        return {
            id: i,
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad),
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: 0,
        };
    });

const set = (points: readonly ContactPoint[], at = 0) => ({ at, points });

const makeBase = (seed = 4): Base => {
    const position = new Position(new CentroidSolver(), new PositionPolicy());
    const direction = new Direction(
        position,
        new ApexHeadingSource(new DirectionPolicy()),
    );
    const move = new Move(position, new MovePolicy());
    return new Base(
        position,
        direction,
        move,
        new Rotate(direction, new RotatePolicy()),
        new Tap(position, new TapPolicy()),
        new Tail(move, new TailPolicy()),
        new Acceleration(move, new AccelerationPolicy()),
        new PxPerMMEstimator(seed, new PxPerMMPolicy()),
    );
};

describe("CentroidSolver", () => {
    it("finds the middle and the foot distance", () => {
        const fit = new CentroidSolver().solve(
            feet(400, 300, 160, [0, 120, 240]),
        );
        expect(fit?.centre.x).toBeCloseTo(400, 6);
        expect(fit?.centre.y).toBeCloseTo(300, 6);
        expect(fit?.radiusPX).toBeCloseTo(160, 6);
        expect(fit?.residualPX).toBeCloseTo(0, 6);
    });

    it("refuses fewer than three feet", () => {
        expect(new CentroidSolver().solve(feet(0, 0, 10, [0, 90]))).toBeNull();
    });
});

describe("CircleFitSolver", () => {
    it("recovers a known circle from feet spread around it", () => {
        const fit = new CircleFitSolver().solve(
            feet(250, 175, 136, [0, 70, 150, 210, 300]),
        );
        expect(fit?.centre.x).toBeCloseTo(250, 4);
        expect(fit?.centre.y).toBeCloseTo(175, 4);
        expect(fit?.radiusPX).toBeCloseTo(136, 4);
    });

    it("returns null for collinear points, which have no circle", () => {
        const line: ContactPoint[] = [0, 1, 2].map((i) => ({
            id: i,
            x: i * 50,
            y: 100,
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: 0,
        }));
        expect(new CircleFitSolver().solve(line)).toBeNull();
    });
});

describe("Position", () => {
    const run = (points: readonly ContactPoint[], pxPerMM = 4) => {
        const p = new Position(new CentroidSolver(), new PositionPolicy());
        p.update({ at: 0, contacts: set(points), spec: SPEC, pxPerMM });
        return p.snapshot();
    };

    it("senses a complete, correctly sized footprint", () => {
        const s = run(feet(400, 300, 160, [0, 132, 228]));
        expect(s.sensed).toBe(true);
        expect(s.complete).toBe(true);
        expect(s.contactCount).toBe(3);
        expect(s.confidence).toBeCloseTo(1, 6);
    });

    it("is not sensed below the minimum number of feet", () => {
        const s = run(feet(400, 300, 160, [0, 132]));
        expect(s.sensed).toBe(false);
        expect(s.centre).toBeNull();
    });

    it("rejects a footprint of the wrong size for the kind", () => {
        const s = run(feet(400, 300, 260, [0, 132, 228]));
        expect(s.confidence).toBe(0);
        expect(s.sensed).toBe(false);
    });

    it("stays sensed but incomplete when a foot drops out", () => {
        const four: FootprintSpec = { ...SPEC, expectedCount: 4 };
        const p = new Position(new CentroidSolver(), new PositionPolicy());
        p.update({
            at: 0,
            contacts: set(feet(400, 300, 160, [0, 132, 228])),
            spec: four,
            pxPerMM: 4,
        });
        expect(p.snapshot().sensed).toBe(true);
        expect(p.snapshot().complete).toBe(false);
    });
});

describe("PxPerMMEstimator", () => {
    const good = (fittedRadiusPX: number) => ({
        sensed: true,
        complete: true,
        contactCount: 3,
        expectedCount: 3,
        centre: { x: 0, y: 0 },
        fittedRadiusPX,
        residualPX: 0,
        confidence: 1,
        shapeConfidence: 1,
    });
    const sample = (pxPerMM: number) => ({
        at: 0,
        contacts: set([]),
        spec: SPEC,
        pxPerMM,
    });

    it("walks a wrong seed towards what the puck actually measures", () => {
        const est = new PxPerMMEstimator(3.8, new PxPerMMPolicy());
        for (let i = 0; i < 400; i += 1) {
            est.observe(good(SPEC.footRadiusMM * 4), sample(4));
        }
        expect(est.value).toBeCloseTo(4, 2);
    });

    it("ignores an incomplete reading", () => {
        const est = new PxPerMMEstimator(3.8, new PxPerMMPolicy());
        est.observe({ ...good(160), complete: false }, sample(4));
        expect(est.value).toBe(3.8);
        expect(est.sampleCount).toBe(0);
    });

    it("ignores a reading whose shape does not match", () => {
        const est = new PxPerMMEstimator(3.8, new PxPerMMPolicy());
        est.observe({ ...good(160), shapeConfidence: 0.4 }, sample(4));
        expect(est.value).toBe(3.8);
    });

    it("clamps however hard a bad reading pushes", () => {
        const est = new PxPerMMEstimator(4, new PxPerMMPolicy());
        for (let i = 0; i < 5000; i += 1) est.observe(good(4000), sample(4));
        expect(est.value).toBeLessThanOrEqual(4 * 1.12 + 1e-9);
    });
});

describe("ApexHeadingSource", () => {
    const src = new ApexHeadingSource(new DirectionPolicy());

    it("points at the apex of an isosceles footprint", () => {
        const found = src.heading(feet(400, 300, 160, [0, 132, 228]), {
            x: 400,
            y: 300,
        });
        expect(found?.headingDeg).toBeCloseTo(0, 4);
    });

    it("follows the footprint round", () => {
        const found = src.heading(feet(400, 300, 160, [90, 222, 318]), {
            x: 400,
            y: 300,
        });
        expect(found?.headingDeg).toBeCloseTo(90, 4);
    });

    it("says nothing about an equilateral footprint", () => {
        const found = src.heading(feet(400, 300, 160, [0, 120, 240]), {
            x: 400,
            y: 300,
        });
        expect(found).toBeNull();
    });
});

describe("GapHeadingSource", () => {
    it("points at the middle of the widest gap", () => {
        const src = new GapHeadingSource(new DirectionPolicy());
        const found = src.heading(
            feet(400, 300, 136, [20, 60, 100, 140, 180]),
            { x: 400, y: 300 },
        );
        expect(found?.headingDeg).toBeCloseTo(280, 4);
    });

    it("says nothing about an evenly spread ring", () => {
        const src = new GapHeadingSource(new DirectionPolicy());
        const found = src.heading(
            feet(400, 300, 136, [0, 72, 144, 216, 288]),
            { x: 400, y: 300 },
        );
        expect(found).toBeNull();
    });
});

describe("DirectionRay", () => {
    const bounds = { width: 1000, height: 600 };

    it("leaves through the right edge when pointing east", () => {
        const ray = DirectionRay.fromHeading({ x: 400, y: 300 }, 0);
        expect(ray.exitPoint(bounds)).toEqual({ x: 1000, y: 300 });
    });

    it("leaves through the bottom edge when pointing down", () => {
        const ray = DirectionRay.fromHeading({ x: 400, y: 300 }, 90);
        const hit = ray.exitPoint(bounds);
        expect(hit?.x).toBeCloseTo(400, 6);
        expect(hit?.y).toBeCloseTo(600, 6);
    });

    it("has no exit point from outside the screen", () => {
        const ray = DirectionRay.fromHeading({ x: -10, y: 300 }, 0);
        expect(ray.exitPoint(bounds)).toBeNull();
    });
});

describe("Base, over a replayed session", () => {
    it("draws the outer ring at the kind's size, not the measurement", () => {
        const base = makeBase(4);
        expect(base.outerDiameterPX(SPEC)).toBeCloseTo(320, 6);
    });

    it("sees the puck arrive, turn and leave", () => {
        const base = makeBase(4);
        const src = new ReplayContactSource(recording);
        const seen: boolean[] = [];
        const headings: number[] = [];
        for (let f = 0; f < 60; f += 1) {
            const at = f * 16;
            const frame = src.frame(at);
            base.update(at, { at, points: frame.points }, SPEC);
            const snap = base.snapshot(at);
            seen.push(snap.position.sensed);
            if (snap.direction.known) headings.push(snap.direction.headingDeg);
        }
        expect(seen[0]).toBe(false);
        expect(seen[30]).toBe(true);
        expect(seen[59]).toBe(false);
        expect(headings[0]).toBeCloseTo(0, 1);
        expect(headings[headings.length - 1]).toBeCloseTo(30, 1);
    });
});
