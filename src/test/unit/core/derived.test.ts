/* Tail and Acceleration: traits built only from tier-one movement.
 *
 * A hand-written `MoveSnapshot` keeps raw contacts out of this rig. If
 * either trait starts depending on them, these tests stop compiling.
 */
import { describe, expect, it } from "vitest";
import {
    Acceleration,
    AccelerationPolicy,
} from "../../../core/base/acceleration";
import { Tail, TailPolicy } from "../../../core/base/tail";
import type { BaseSample } from "../../../core/base/BaseSample";
import type { FootprintSpec } from "../../../core/base/FootprintSpec";
import type { Move } from "../../../core/base/move/Move";
import type { MoveSnapshot } from "../../../core/base/move/MoveSnapshot";
import type { Vec2 } from "../../../core/base/Vec2";

const SPEC: FootprintSpec = {
    expectedCount: 3,
    footRadiusMM: 40,
    outerDiameterMM: 80,
};
const ZERO: Vec2 = { x: 0, y: 0 };

type Rig = {
    acceleration: Acceleration;
    setMove: (to: Vec2 | null, deltaFrame?: Vec2) => void;
    step: (at: number) => void;
    tail: Tail;
};

const rig = (
    tailPolicy = new TailPolicy(),
    accelerationPolicy = new AccelerationPolicy(),
): Rig => {
    let movement: MoveSnapshot = {
        moving: false,
        from: null,
        to: null,
        deltaFrame: ZERO,
        deltaTotal: ZERO,
        distancePX: 0,
        travelledPX: 0,
    };
    const move = {
        snapshot: (): MoveSnapshot => movement,
    } as Move;
    const tail = new Tail(move, tailPolicy);
    const acceleration = new Acceleration(move, accelerationPolicy);

    return {
        acceleration,
        tail,
        setMove(to, deltaFrame = ZERO) {
            movement = {
                moving: Math.hypot(deltaFrame.x, deltaFrame.y) > 0,
                from: movement.to,
                to,
                deltaFrame,
                deltaTotal: ZERO,
                distancePX: Math.hypot(deltaFrame.x, deltaFrame.y),
                travelledPX: 0,
            };
        },
        step(at) {
            const sample: BaseSample = {
                at,
                get contacts(): never {
                    throw new Error("A derived trait read raw contacts");
                },
                spec: SPEC,
                pxPerMM: 4,
            };
            tail.update(sample);
            acceleration.update(sample);
        },
    };
};

describe("Tail", () => {
    it("does not add points while the object rests", () => {
        const r = rig(new TailPolicy(20, 10_000, 5));
        r.setMove({ x: 100, y: 50 });
        r.step(0);
        for (let at = 10; at <= 100; at += 10) r.step(at);
        expect(r.tail.snapshot().points).toEqual([{ x: 100, y: 50, at: 0 }]);
    });

    it("keeps the same snapshot when no point changes", () => {
        const r = rig(new TailPolicy(20, 10_000, 5));
        r.setMove({ x: 100, y: 50 });
        r.step(0);
        const previousSnapshot = r.tail.snapshot();
        r.step(10);
        expect(r.tail.snapshot()).toBe(previousSnapshot);
    });

    it("keeps no more than maxPoints", () => {
        const r = rig(new TailPolicy(3, 10_000, 1));
        for (let n = 0; n < 5; n += 1) {
            r.setMove({ x: n * 2, y: 0 }, { x: 2, y: 0 });
            r.step(n * 10);
        }
        expect(r.tail.snapshot().points.map((point) => point.x)).toEqual([
            4, 6, 8,
        ]);
    });

    it("removes points older than maxAgeMS", () => {
        const r = rig(new TailPolicy(20, 25, 1));
        for (let n = 0; n < 4; n += 1) {
            r.setMove({ x: n * 2, y: 0 }, { x: 2, y: 0 });
            r.step(n * 10);
        }
        expect(r.tail.snapshot().points.map((point) => point.at)).toEqual([
            10, 20, 30,
        ]);
    });

    it("does not mutate published history when a ring slot is reused", () => {
        const r = rig(new TailPolicy(2, 10_000, 1));
        r.setMove({ x: 0, y: 0 });
        r.step(0);
        r.setMove({ x: 2, y: 0 }, { x: 2, y: 0 });
        r.step(10);
        const previousSnapshot = r.tail.snapshot();

        r.setMove({ x: 4, y: 0 }, { x: 2, y: 0 });
        r.step(20);

        expect(Object.isFrozen(previousSnapshot.points)).toBe(true);
        expect(Object.isFrozen(previousSnapshot.points[0])).toBe(true);
        expect(previousSnapshot.points).toEqual([
            { x: 0, y: 0, at: 0 },
            { x: 2, y: 0, at: 10 },
        ]);
        expect(r.tail.snapshot().points).toEqual([
            { x: 2, y: 0, at: 10 },
            { x: 4, y: 0, at: 20 },
        ]);
    });

    it("empties on reset", () => {
        const r = rig();
        r.setMove({ x: 10, y: 20 });
        r.step(0);
        r.tail.reset();
        expect(r.tail.snapshot().points).toEqual([]);
    });
});

describe("Acceleration", () => {
    it("reports analytic speed for a constant straight path", () => {
        const r = rig(undefined, new AccelerationPolicy(0.5));
        r.setMove({ x: 0, y: 0 });
        r.step(0);
        for (let n = 1; n <= 4; n += 1) {
            r.setMove({ x: n * 10, y: 0 }, { x: 10, y: 0 });
            r.step(n * 100);
        }
        const snapshot = r.acceleration.snapshot();
        expect(snapshot.velocity).toEqual({ x: 100, y: 0 });
        expect(snapshot.speedPXperS).toBe(100);
        expect(snapshot.acceleration).toEqual({ x: 0, y: 0 });
        expect(snapshot.peakSpeed).toBe(100);
    });

    it("ignores a zero time step without poisoning later frames", () => {
        const r = rig(undefined, new AccelerationPolicy(1));
        r.setMove({ x: 0, y: 0 });
        r.step(0);
        r.setMove({ x: 10, y: 0 }, { x: 10, y: 0 });
        r.step(0);
        r.step(100);
        const values = Object.values(r.acceleration.snapshot()).flatMap(
            (value) =>
                typeof value === "number" ? [value] : [value.x, value.y],
        );
        expect(values.every(Number.isFinite)).toBe(true);
        expect(r.acceleration.snapshot().speedPXperS).toBe(100);
    });

    it("re-primes timing after a negative time step", () => {
        const r = rig(undefined, new AccelerationPolicy(1));
        r.setMove({ x: 0, y: 0 });
        r.step(100);
        r.setMove({ x: 10, y: 0 }, { x: 10, y: 0 });
        r.step(90);
        r.setMove({ x: 30, y: 0 }, { x: 20, y: 0 });
        r.step(110);
        expect(r.acceleration.snapshot().speedPXperS).toBe(1_000);
        expect(r.acceleration.snapshot().acceleration).toEqual(ZERO);
    });

    it("empties on reset", () => {
        const r = rig(undefined, new AccelerationPolicy(1));
        r.setMove({ x: 0, y: 0 });
        r.step(0);
        r.setMove({ x: 10, y: 0 }, { x: 10, y: 0 });
        r.step(100);
        r.acceleration.reset();
        expect(r.acceleration.snapshot()).toEqual({
            velocity: ZERO,
            speedPXperS: 0,
            acceleration: ZERO,
            peakSpeed: 0,
        });
    });
});
