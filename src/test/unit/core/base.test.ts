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
    FootprintCompletion,
    FootprintCompletionPolicy,
    GapHeadingSource,
    Move,
    MovePolicy,
    Position,
    PositionPolicy,
    PxPerMMEstimator,
    PxPerMMPolicy,
    Rotate,
    HeadingRotationSource,
    RotatePolicy,
    MotionHistory,
    MotionHistoryPolicy,
    Tap,
} from "../../../core/base";
import { ReplayContactSource } from "../../../core/contact";
import type { ContactRecording, SensedContact } from "../../../core/contact";
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
): SensedContact[] =>
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

const set = (points: readonly SensedContact[], at = 0) => ({ at, points });

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
        new Rotate(
            new HeadingRotationSource(direction, new RotatePolicy()),
            new RotatePolicy(),
            direction,
        ),
        new Tap(position),
        new MotionHistory(move, new MotionHistoryPolicy()),
        new Acceleration(move, new AccelerationPolicy()),
        new PxPerMMEstimator(seed, new PxPerMMPolicy()),
        new FootprintCompletion(new FootprintCompletionPolicy()),
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

    it("refuses a circle the feet do not wrap around", () => {
        /* Five contacts along a line with sub-pixel scatter fit a
           circle of radius 3790 px with a residual of 2. Measured
           against that radius the residual looks like a perfect ring,
           and one such frame was enough to drag the table's shared
           scale to its clamp. */
        const strungOut: SensedContact[] = [
            [500, 400.3],
            [600, 399.6],
            [700, 400.5],
            [800, 399.8],
            [900, 400.1],
        ].map(([x, y], i) => ({
            id: i,
            x: x ?? 0,
            y: y ?? 0,
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: 0,
        }));
        expect(new CircleFitSolver().solve(strungOut)).toBeNull();
    });

    it("still fits a real ring", () => {
        const ring = [0, 70, 150, 210, 300].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            return {
                id: i,
                x: 400 + 136 * Math.cos(rad),
                y: 300 + 136 * Math.sin(rad),
                radiusPX: 9,
                firstSeen: 0,
                lastSeen: 0,
            };
        });
        expect(new CircleFitSolver().solve(ring)?.radiusPX).toBeCloseTo(
            136,
            6,
        );
    });

    it("returns null for collinear points, which have no circle", () => {
        const line: SensedContact[] = [0, 1, 2].map((i) => ({
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
    const run = (points: readonly SensedContact[], pxPerMM = 4) => {
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

describe("FootprintCompletion", () => {
    const whole = (at: number, cx = 400, cy = 300) =>
        set(feet(cx, cy, 160, [0, 132, 228]), at);

    /* A completion that has already watched one whole frame, which is
       the precondition for every reconstruction. */
    const watching = () => {
        const completion = new FootprintCompletion(
            new FootprintCompletionPolicy(),
        );
        const position = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        const contacts = whole(0);
        position.update({ at: 0, contacts, spec: SPEC, pxPerMM: 4 });
        completion.remember(contacts, position.snapshot());
        return completion;
    };

    it("puts the missing foot back where the puck took it", () => {
        const completion = watching();
        /* The same puck, shifted 40 px, with its third foot gone. */
        const moved = whole(16, 440, 300);
        const two = { at: 16, points: moved.points.slice(0, 2) };
        const done = completion.complete(two, SPEC);
        expect(done.points).toHaveLength(3);
        const third = done.points[2];
        expect(third?.reconstructed).toBe(true);
        expect(third?.x).toBeCloseTo(moved.points[2]?.x ?? NaN, 6);
        expect(third?.y).toBeCloseTo(moved.points[2]?.y ?? NaN, 6);
        /* The same foot, so it keeps its id and the nose stays the
           nose. */
        expect(third?.id).toBe(moved.points[2]?.id);
    });

    it("never establishes a footprint it has not seen whole", () => {
        const completion = new FootprintCompletion(
            new FootprintCompletionPolicy(),
        );
        const two = { at: 0, points: whole(0).points.slice(0, 2) };
        expect(completion.complete(two, SPEC).points).toHaveLength(2);
    });

    it("refuses a finger that lands at the wrong distance", () => {
        const completion = watching();
        const points = whole(16).points.slice(0, 2);
        const first = points[0];
        const second = points[1];
        if (first === undefined || second === undefined) throw new Error("!");
        /* The right ids, well outside `rigidTolerance` of the distance
           those two feet were apart. A puck is rigid; this is not one. */
        const stretched = [first, { ...second, x: second.x + 60 }];
        const done = completion.complete({ at: 16, points: stretched }, SPEC);
        expect(done.points).toHaveLength(2);
    });

    it("holds for as long as the two feet stay down", () => {
        /* No time limit, on purpose. How old the reference is decides
           nothing: two feet that have been on the glass without
           interruption since it was taken are still those two feet a
           minute later, and the motion between the two frames is still
           the motion the puck made. */
        const completion = watching();
        const late = whole(60000);
        const two = { at: 60000, points: late.points.slice(0, 2) };
        expect(completion.complete(two, SPEC).points).toHaveLength(3);
    });

    it("refuses a contact id the driver handed out again", () => {
        /* The one thing a time limit was standing in for. A foot that
           lifted and a new touch that inherited its id look identical
           by id alone; `firstSeen` tells them apart exactly. */
        const completion = watching();
        const points = whole(16).points.slice(0, 2);
        const recycled = points.map((p) => ({ ...p, firstSeen: 16 }));
        expect(
            completion.complete({ at: 16, points: recycled }, SPEC).points,
        ).toHaveLength(2);
    });

    it("leaves a whole frame exactly as it found it", () => {
        const completion = watching();
        const contacts = whole(16);
        expect(completion.complete(contacts, SPEC)).toBe(contacts);
    });

    it("forgets its reference when it is reset", () => {
        const completion = watching();
        completion.reset();
        const two = { at: 16, points: whole(16).points.slice(0, 2) };
        expect(completion.complete(two, SPEC).points).toHaveLength(2);
    });

    it("does not let a held frame move the table's scale", () => {
        /* The loop the estimator's whole design avoids: a
           reconstructed foot carries the scale it was reconstructed
           with, so a reading taken from it would confirm whatever the
           scale already said. */
        const completion = watching();
        const position = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        const estimator = new PxPerMMEstimator(3.8, new PxPerMMPolicy());
        const two = { at: 16, points: whole(16).points.slice(0, 2) };
        const sample = {
            at: 16,
            contacts: completion.complete(two, SPEC),
            spec: SPEC,
            pxPerMM: 3.8,
        };
        position.update(sample);
        expect(position.snapshot().held).toBe(true);
        estimator.observe(position.snapshot(), sample);
        expect(estimator.value).toBe(3.8);
        expect(estimator.sampleCount).toBe(0);
    });

    it("scores a held reading below a whole one", () => {
        const completion = watching();
        const position = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        const two = { at: 16, points: whole(16).points.slice(0, 2) };
        position.update({
            at: 16,
            contacts: completion.complete(two, SPEC),
            spec: SPEC,
            pxPerMM: 4,
        });
        const heldConfidence = position.snapshot().confidence;
        position.update({
            at: 32,
            contacts: whole(32),
            spec: SPEC,
            pxPerMM: 4,
        });
        expect(heldConfidence).toBeLessThan(position.snapshot().confidence);
        expect(heldConfidence).toBeGreaterThan(0);
    });
});

describe("PxPerMMEstimator", () => {
    const good = (fittedRadiusPX: number) => ({
        sensed: true,
        complete: true,
        held: false,
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

    /* Three feet at explicit places, so which one is the apex can be
       worked out by hand: the vertex opposite the odd side. */
    const at = (places: readonly (readonly [number, number])[]) =>
        places.map(([x, y], i) => ({
            id: i,
            x,
            y,
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: 0,
        }));
    const centroid = (points: readonly { x: number; y: number }[]) => ({
        x: points.reduce((s, p) => s + p.x, 0) / points.length,
        y: points.reduce((s, p) => s + p.y, 0) / points.length,
    });

    it("keeps its nose through a frame too even to read", () => {
        /* The bug this replaces: one frame whose asymmetry dipped
           under the threshold forgot the choice, and the next frame
           picked again from scratch. The real pucks sit at 6% against
           a 0.06 threshold, so such a frame is the ordinary case — and
           the nose hopped to another foot in the middle of a session.

           Frames one and three are the same triangle with the labels
           moved round, so a fresh pick names foot 1 and a held one
           still names foot 0. */
        const source = new ApexHeadingSource(new DirectionPolicy());
        const first = at([
            [0, 100],
            [-80, -60],
            [80, -60],
        ]);
        expect(source.heading(first, centroid(first))?.reference).toEqual({
            x: 0,
            y: 100,
        });

        expect(
            source.heading(feet(400, 300, 160, [0, 120, 240]), {
                x: 400,
                y: 300,
            }),
        ).toBeNull();

        const third = at([
            [-80, -60],
            [0, 100],
            [80, -60],
        ]);
        expect(source.heading(third, centroid(third))?.reference).toEqual({
            x: -80,
            y: -60,
        });
    });

    it("forgets its nose once that foot leaves the glass", () => {
        /* The one thing that does end a choice. A foot that comes back
           has a new contact id and is a different foot as far as
           anything here is concerned. */
        const source = new ApexHeadingSource(new DirectionPolicy());
        const first = at([
            [0, 100],
            [-80, -60],
            [80, -60],
        ]);
        source.heading(first, centroid(first));
        const renumbered = first.map((p, i) => ({ ...p, id: i + 10 }));
        expect(
            source.heading(renumbered, centroid(renumbered))?.reference,
        ).toEqual({ x: 0, y: 100 });
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
