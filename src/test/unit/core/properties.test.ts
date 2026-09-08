/* Randomised invariants for the geometry beneath every puck.
 *
 * Hand-picked examples explain intent; these seeded cases search the
 * surrounding input space. Every assertion carries the generator state
 * from before its case, so a failure can be replayed exactly.
 */
import { describe, expect, it } from "vitest";
import {
    ApexHeadingSource,
    CentroidSolver,
    CircleFitSolver,
    DirectionPolicy,
    DirectionRay,
    GapHeadingSource,
    PxPerMMEstimator,
    PxPerMMPolicy,
    shortestAngleDiffDeg,
} from "../../../core/base";
import type {
    BaseSample,
    CentreFit,
    PositionSnapshot,
    ScreenBounds,
    Vec2,
} from "../../../core/base";

const CASES = 240;
const FULL_TURN_DEG = 360;
const HALF_TURN_DEG = 180;
const UINT32_RANGE = 4_294_967_296;
const FLOAT_TOLERANCE = 1e-7;
const ANGLE_TOLERANCE = 1e-8;
const SEED_SOLVERS = 0x51a7e001;
const SEED_APEX = 0xa9e00001;
const SEED_GAP = 0x6a900001;
const SEED_ANGLES = 0xa961e001;
const SEED_RAYS = 0x7a700001;
const SEED_SCALE = 0x5ca1e001;

type Point = {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly radiusPX: number;
    readonly firstSeen: number;
    readonly lastSeen: number;
};

type Solver = {
    solve(points: readonly Point[]): CentreFit | null;
};

class Random {
    #state: number;

    constructor(seed: number) {
        this.#state = seed >>> 0;
    }

    get state(): number {
        return this.#state;
    }

    next(): number {
        this.#state =
            (Math.imul(1_664_525, this.#state) + 1_013_904_223) >>> 0;
        return this.#state / UINT32_RANGE;
    }

    range(min: number, max: number): number {
        return min + (max - min) * this.next();
    }

    integer(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }
}

const forCases = (
    seed: number,
    property: (random: Random, caseSeed: number, index: number) => void,
): void => {
    const random = new Random(seed);
    for (let index = 0; index < CASES; index += 1) {
        const caseSeed = random.state;
        property(random, caseSeed, index);
    }
};

const point = (id: number, x: number, y: number): Point => ({
    id,
    x,
    y,
    radiusPX: 8,
    firstSeen: 0,
    lastSeen: 0,
});

const radians = (degrees: number): number =>
    (degrees * Math.PI) / HALF_TURN_DEG;

const normaliseDeg = (degrees: number): number =>
    ((degrees % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG;

const rotate = (value: Vec2, pivot: Vec2, degrees: number): Vec2 => {
    const angle = radians(degrees);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const x = value.x - pivot.x;
    const y = value.y - pivot.y;
    return {
        x: pivot.x + x * cosine - y * sine,
        y: pivot.y + x * sine + y * cosine,
    };
};

const mapPoints = (
    points: readonly Point[],
    transform: (value: Vec2) => Vec2,
): Point[] =>
    points.map((source) => {
        const transformed = transform(source);
        return point(source.id, transformed.x, transformed.y);
    });

const ring = (
    random: Random,
    count: number,
    noisePX: number = 0,
): { centre: Vec2; points: Point[]; radiusPX: number } => {
    const centre = {
        x: random.range(-400, 400),
        y: random.range(-300, 300),
    };
    const radiusPX = random.range(30, 300);
    const phase = random.range(0, FULL_TURN_DEG);
    const points = Array.from({ length: count }, (_, id) => {
        const angle = radians(phase + (id * FULL_TURN_DEG) / count);
        return point(
            id,
            centre.x +
                radiusPX * Math.cos(angle) +
                random.range(-noisePX, noisePX),
            centre.y +
                radiusPX * Math.sin(angle) +
                random.range(-noisePX, noisePX),
        );
    });
    return { centre, points, radiusPX };
};

const shuffled = (source: readonly Point[], random: Random): Point[] => {
    const result = [...source];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const other = random.integer(0, index);
        const here = result[index];
        const there = result[other];
        if (here === undefined || there === undefined) {
            throw new Error("Shuffle index escaped its array");
        }
        result[index] = there;
        result[other] = here;
    }
    return result;
};

const solved = (
    solver: Solver,
    points: readonly Point[],
    caseSeed: number,
): CentreFit => {
    const fit = solver.solve(points);
    if (fit === null) {
        throw new Error(`Unexpected null fit; seed=${caseSeed}`);
    }
    return fit;
};

const close = (
    actual: number,
    expected: number,
    caseSeed: number,
    label: string,
    tolerance: number = FLOAT_TOLERANCE,
): void => {
    const error = Math.abs(actual - expected);
    const limit = tolerance * Math.max(1, Math.abs(expected));
    expect(error, `${label}; seed=${caseSeed}`).toBeLessThanOrEqual(limit);
};

const closePoint = (
    actual: Vec2,
    expected: Vec2,
    caseSeed: number,
    label: string,
): void => {
    close(actual.x, expected.x, caseSeed, `${label}.x`);
    close(actual.y, expected.y, caseSeed, `${label}.y`);
};

const solvers = (): readonly Solver[] => [
    new CentroidSolver(),
    new CircleFitSolver(),
];

describe("centre solver properties", () => {
    it("is translation invariant", () => {
        forCases(SEED_SOLVERS, (random, caseSeed) => {
            const source = ring(random, random.integer(3, 8), 0.5);
            const offset = {
                x: random.range(-500, 500),
                y: random.range(-500, 500),
            };
            const moved = mapPoints(source.points, (value) => ({
                x: value.x + offset.x,
                y: value.y + offset.y,
            }));
            for (const solver of solvers()) {
                const before = solved(solver, source.points, caseSeed);
                const after = solved(solver, moved, caseSeed);
                closePoint(
                    after.centre,
                    {
                        x: before.centre.x + offset.x,
                        y: before.centre.y + offset.y,
                    },
                    caseSeed,
                    "translated centre",
                );
                close(
                    after.radiusPX,
                    before.radiusPX,
                    caseSeed,
                    "translated radius",
                );
                close(
                    after.residualPX,
                    before.residualPX,
                    caseSeed,
                    "translated residual",
                );
            }
        });
    });

    it("is rotation invariant", () => {
        forCases(SEED_SOLVERS + 1, (random, caseSeed) => {
            const source = ring(random, random.integer(3, 8), 0.5);
            const pivot = {
                x: random.range(-200, 200),
                y: random.range(-200, 200),
            };
            const degrees = random.range(-720, 720);
            const turned = mapPoints(source.points, (value) =>
                rotate(value, pivot, degrees),
            );
            for (const solver of solvers()) {
                const before = solved(solver, source.points, caseSeed);
                const after = solved(solver, turned, caseSeed);
                closePoint(
                    after.centre,
                    rotate(before.centre, pivot, degrees),
                    caseSeed,
                    "rotated centre",
                );
                close(
                    after.radiusPX,
                    before.radiusPX,
                    caseSeed,
                    "rotated radius",
                );
                close(
                    after.residualPX,
                    before.residualPX,
                    caseSeed,
                    "rotated residual",
                );
            }
        });
    });

    it("scales its result with its input", () => {
        forCases(SEED_SOLVERS + 2, (random, caseSeed) => {
            const source = ring(random, random.integer(3, 8), 0.5);
            const scale = random.range(0.25, 4);
            const scaled = mapPoints(source.points, (value) => ({
                x: value.x * scale,
                y: value.y * scale,
            }));
            for (const solver of solvers()) {
                const before = solved(solver, source.points, caseSeed);
                const after = solved(solver, scaled, caseSeed);
                closePoint(
                    after.centre,
                    {
                        x: before.centre.x * scale,
                        y: before.centre.y * scale,
                    },
                    caseSeed,
                    "scaled centre",
                );
                close(
                    after.radiusPX,
                    before.radiusPX * scale,
                    caseSeed,
                    "scaled radius",
                );
                close(
                    after.residualPX,
                    before.residualPX * scale,
                    caseSeed,
                    "scaled residual",
                );
            }
        });
    });

    it("is independent of point order", () => {
        forCases(SEED_SOLVERS + 3, (random, caseSeed) => {
            const source = ring(random, random.integer(3, 8), 0.5);
            const reordered = shuffled(source.points, random);
            for (const solver of solvers()) {
                const before = solved(solver, source.points, caseSeed);
                const after = solved(solver, reordered, caseSeed);
                closePoint(
                    after.centre,
                    before.centre,
                    caseSeed,
                    "reordered centre",
                );
                close(
                    after.radiusPX,
                    before.radiusPX,
                    caseSeed,
                    "reordered radius",
                );
                close(
                    after.residualPX,
                    before.residualPX,
                    caseSeed,
                    "reordered residual",
                );
            }
        });
    });

    it("recovers a known noisy circle within its noise bound", () => {
        forCases(SEED_SOLVERS + 4, (random, caseSeed) => {
            const noisePX = random.range(0.01, 1.5);
            const source = ring(random, random.integer(4, 8), noisePX);
            const maximumPointNoise = Math.SQRT2 * noisePX;
            const bounds = [maximumPointNoise, 4 * maximumPointNoise];
            const currentSolvers = solvers();
            for (let index = 0; index < currentSolvers.length; index += 1) {
                const solver = currentSolvers[index];
                const bound = bounds[index];
                if (solver === undefined || bound === undefined) {
                    throw new Error("A solver has no derived noise bound");
                }
                const fit = solved(solver, source.points, caseSeed);
                const error = Math.hypot(
                    fit.centre.x - source.centre.x,
                    fit.centre.y - source.centre.y,
                );
                /* A centroid averages vectors bounded by sqrt(2) times
                   the coordinate noise. A full-ring algebraic fit gets
                   four times that bound because it squares its terms. */
                expect(
                    error,
                    `noisy centre; seed=${caseSeed}; noise=${noisePX}`,
                ).toBeLessThanOrEqual(bound + FLOAT_TOLERANCE);
            }
        });
    });
});

const apexPoints = (
    centre: Vec2,
    radiusPX: number,
    rotationDeg: number,
    equilateralOffsetDeg: number,
): Point[] =>
    [
        rotationDeg,
        rotationDeg + 120 + equilateralOffsetDeg,
        rotationDeg + 240 - equilateralOffsetDeg,
    ].map((degrees, id) =>
        point(
            id,
            centre.x + radiusPX * Math.cos(radians(degrees)),
            centre.y + radiusPX * Math.sin(radians(degrees)),
        ),
    );

const apexBoundary = (
    source: ApexHeadingSource,
    centre: Vec2,
    radiusPX: number,
    rotationDeg: number,
    sign: number,
): number => {
    let below = 0;
    let above = 20;
    for (let iteration = 0; iteration < 50; iteration += 1) {
        const middle = (below + above) / 2;
        const result = source.heading(
            apexPoints(centre, radiusPX, rotationDeg, sign * middle),
            centre,
        );
        if (result === null) below = middle;
        else above = middle;
    }
    return above;
};

describe("ApexHeadingSource properties", () => {
    it("turns its heading with its input", () => {
        forCases(SEED_APEX, (random, caseSeed) => {
            const source = new ApexHeadingSource(new DirectionPolicy());
            const centre = {
                x: random.range(-300, 300),
                y: random.range(-300, 300),
            };
            const radiusPX = random.range(20, 250);
            const start = random.range(-720, 720);
            const turn = random.range(-720, 720);
            const magnitude = random.range(8, 25);
            const offset = random.next() < 0.5 ? -magnitude : magnitude;
            const before = source.heading(
                apexPoints(centre, radiusPX, start, offset),
                centre,
            );
            const after = source.heading(
                apexPoints(centre, radiusPX, start + turn, offset),
                centre,
            );
            expect(before, `first apex; seed=${caseSeed}`).not.toBeNull();
            expect(after, `turned apex; seed=${caseSeed}`).not.toBeNull();
            if (before === null || after === null) return;
            const error = shortestAngleDiffDeg(
                before.headingDeg + turn,
                after.headingDeg,
            );
            close(error, 0, caseSeed, "apex rotation", ANGLE_TOLERANCE);
        });
    });

    it("always normalises its heading", () => {
        forCases(SEED_APEX + 1, (random, caseSeed) => {
            const source = new ApexHeadingSource(new DirectionPolicy());
            const centre = {
                x: random.range(-300, 300),
                y: random.range(-300, 300),
            };
            const result = source.heading(
                apexPoints(
                    centre,
                    random.range(20, 250),
                    random.range(-10_000, 10_000),
                    random.range(8, 25),
                ),
                centre,
            );
            expect(result, `apex result; seed=${caseSeed}`).not.toBeNull();
            if (result === null) return;
            expect(
                result.headingDeg,
                `apex low; seed=${caseSeed}`,
            ).toBeGreaterThanOrEqual(0);
            expect(
                result.headingDeg,
                `apex high; seed=${caseSeed}`,
            ).toBeLessThan(FULL_TURN_DEG);
        });
    });

    it("rejects footprints inside the near-equilateral band", () => {
        forCases(SEED_APEX + 2, (random, caseSeed) => {
            const source = new ApexHeadingSource(new DirectionPolicy());
            const centre = {
                x: random.range(-300, 300),
                y: random.range(-300, 300),
            };
            const result = source.heading(
                apexPoints(
                    centre,
                    random.range(20, 250),
                    random.range(-720, 720),
                    random.range(-4, 4),
                ),
                centre,
            );
            expect(result, `near-equilateral; seed=${caseSeed}`).toBeNull();
        });
    });

    it("places the asymmetry boundary about five degrees away", () => {
        forCases(SEED_APEX + 3, (random, caseSeed) => {
            const source = new ApexHeadingSource(new DirectionPolicy());
            const centre = {
                x: random.range(-300, 300),
                y: random.range(-300, 300),
            };
            const radiusPX = random.range(20, 250);
            const rotationDeg = random.range(-720, 720);
            const inward = apexBoundary(
                source,
                centre,
                radiusPX,
                rotationDeg,
                1,
            );
            const outward = apexBoundary(
                source,
                centre,
                radiusPX,
                rotationDeg,
                -1,
            );
            close(inward, 5.225_784_995, caseSeed, "inward boundary", 1e-8);
            close(outward, 5.367_277_693, caseSeed, "outward boundary", 1e-8);
        });
    });
});

const gapPoints = (
    centre: Vec2,
    radiusPX: number,
    count: number,
    headingDeg: number,
): Point[] => {
    const widest = (2 * FULL_TURN_DEG) / (count + 1);
    const ordinary = (FULL_TURN_DEG - widest) / (count - 1);
    const first = headingDeg + widest / 2;
    return Array.from({ length: count }, (_, id) => {
        const degrees = first + id * ordinary;
        return point(
            id,
            centre.x + radiusPX * Math.cos(radians(degrees)),
            centre.y + radiusPX * Math.sin(radians(degrees)),
        );
    });
};

const widestGap = (
    points: readonly Point[],
    centre: Vec2,
): { startDeg: number; widthDeg: number } => {
    const angles = points
        .map((value) =>
            normaliseDeg(
                (Math.atan2(value.y - centre.y, value.x - centre.x) *
                    HALF_TURN_DEG) /
                    Math.PI,
            ),
        )
        .sort((left, right) => left - right);
    let startDeg = 0;
    let widthDeg = -1;
    for (let index = 0; index < angles.length; index += 1) {
        const here = angles[index];
        const next = angles[(index + 1) % angles.length];
        if (here === undefined || next === undefined) {
            throw new Error("Gap index escaped its angle array");
        }
        const width = normaliseDeg(next - here);
        if (width > widthDeg) {
            startDeg = here;
            widthDeg = width;
        }
    }
    return { startDeg, widthDeg };
};

describe("GapHeadingSource properties", () => {
    it("turns with rings of four to eight feet", () => {
        forCases(SEED_GAP, (random, caseSeed) => {
            const source = new GapHeadingSource(new DirectionPolicy());
            const centre = {
                x: random.range(-300, 300),
                y: random.range(-300, 300),
            };
            const radiusPX = random.range(20, 250);
            const count = random.integer(4, 8);
            const heading = random.range(-720, 720);
            const turn = random.range(-720, 720);
            const before = source.heading(
                gapPoints(centre, radiusPX, count, heading),
                centre,
            );
            const after = source.heading(
                gapPoints(centre, radiusPX, count, heading + turn),
                centre,
            );
            expect(before, `first gap; seed=${caseSeed}`).not.toBeNull();
            expect(after, `turned gap; seed=${caseSeed}`).not.toBeNull();
            if (before === null || after === null) return;
            const error = shortestAngleDiffDeg(
                before.headingDeg + turn,
                after.headingDeg,
            );
            close(error, 0, caseSeed, "gap rotation", ANGLE_TOLERANCE);
        });
    });

    it("returns a heading inside the widest angular gap", () => {
        forCases(SEED_GAP + 1, (random, caseSeed) => {
            const source = new GapHeadingSource(new DirectionPolicy());
            const centre = {
                x: random.range(-300, 300),
                y: random.range(-300, 300),
            };
            const points = gapPoints(
                centre,
                random.range(20, 250),
                random.integer(4, 8),
                random.range(-720, 720),
            );
            const result = source.heading(points, centre);
            expect(result, `widest gap; seed=${caseSeed}`).not.toBeNull();
            if (result === null) return;
            const gap = widestGap(points, centre);
            const intoGap = normaliseDeg(result.headingDeg - gap.startDeg);
            expect(intoGap, `gap start; seed=${caseSeed}`).toBeGreaterThan(0);
            expect(intoGap, `gap end; seed=${caseSeed}`).toBeLessThan(
                gap.widthDeg,
            );
        });
    });
});

describe("shortestAngleDiffDeg properties", () => {
    it("always lies in (-180, 180]", () => {
        forCases(SEED_ANGLES, (random, caseSeed) => {
            const from = random.range(-100_000, 100_000);
            const to = random.range(-100_000, 100_000);
            const difference = shortestAngleDiffDeg(from, to);
            expect(difference, `angle low; seed=${caseSeed}`).toBeGreaterThan(
                -HALF_TURN_DEG,
            );
            expect(
                difference,
                `angle high; seed=${caseSeed}`,
            ).toBeLessThanOrEqual(HALF_TURN_DEG);
        });
    });

    it("is antisymmetric except at exactly half a turn", () => {
        forCases(SEED_ANGLES + 1, (random, caseSeed) => {
            const from = random.range(-100_000, 100_000);
            const to = random.range(-100_000, 100_000);
            const forward = shortestAngleDiffDeg(from, to);
            const backward = shortestAngleDiffDeg(to, from);
            if (Math.abs(forward) === HALF_TURN_DEG) return;
            close(
                forward,
                -backward,
                caseSeed,
                "angle antisymmetry",
                ANGLE_TOLERANCE,
            );
        });
    });

    it("is unchanged by whole turns on either argument", () => {
        forCases(SEED_ANGLES + 2, (random, caseSeed) => {
            const from = random.range(-10_000, 10_000);
            const to = random.range(-10_000, 10_000);
            const fromTurns = random.integer(-100, 100);
            const toTurns = random.integer(-100, 100);
            const expected = shortestAngleDiffDeg(from, to);
            const fromShifted = shortestAngleDiffDeg(
                from + fromTurns * FULL_TURN_DEG,
                to,
            );
            const toShifted = shortestAngleDiffDeg(
                from,
                to + toTurns * FULL_TURN_DEG,
            );
            close(
                fromShifted,
                expected,
                caseSeed,
                "from whole-turn invariance",
                ANGLE_TOLERANCE,
            );
            close(
                toShifted,
                expected,
                caseSeed,
                "to whole-turn invariance",
                ANGLE_TOLERANCE,
            );
        });
    });
});

describe("DirectionRay properties", () => {
    it("exits through the boundary in front of an interior origin", () => {
        forCases(SEED_RAYS, (random, caseSeed) => {
            const bounds: ScreenBounds = {
                width: random.range(100, 4_000),
                height: random.range(100, 3_000),
            };
            const origin = {
                x: random.range(0.01, bounds.width - 0.01),
                y: random.range(0.01, bounds.height - 0.01),
            };
            const heading = random.range(-10_000, 10_000);
            const ray = DirectionRay.fromHeading(origin, heading);
            const exit = ray.exitPoint(bounds);
            expect(exit, `ray exit; seed=${caseSeed}`).not.toBeNull();
            if (exit === null) return;
            const boundaryError = Math.min(
                Math.abs(exit.x),
                Math.abs(exit.y),
                Math.abs(exit.x - bounds.width),
                Math.abs(exit.y - bounds.height),
            );
            expect(
                boundaryError,
                `ray boundary; seed=${caseSeed}`,
            ).toBeLessThanOrEqual(FLOAT_TOLERANCE);
            expect(
                exit.x,
                `ray x low; seed=${caseSeed}`,
            ).toBeGreaterThanOrEqual(-FLOAT_TOLERANCE);
            expect(exit.x, `ray x high; seed=${caseSeed}`).toBeLessThanOrEqual(
                bounds.width + FLOAT_TOLERANCE,
            );
            expect(
                exit.y,
                `ray y low; seed=${caseSeed}`,
            ).toBeGreaterThanOrEqual(-FLOAT_TOLERANCE);
            expect(exit.y, `ray y high; seed=${caseSeed}`).toBeLessThanOrEqual(
                bounds.height + FLOAT_TOLERANCE,
            );
            const dot =
                (exit.x - origin.x) * ray.unit.x +
                (exit.y - origin.y) * ray.unit.y;
            expect(dot, `ray direction; seed=${caseSeed}`).toBeGreaterThan(0);
        });
    });

    it("is unchanged when the heading gains a full turn", () => {
        forCases(SEED_RAYS + 1, (random, caseSeed) => {
            const bounds: ScreenBounds = {
                width: random.range(100, 4_000),
                height: random.range(100, 3_000),
            };
            const origin = {
                x: random.range(0.01, bounds.width - 0.01),
                y: random.range(0.01, bounds.height - 0.01),
            };
            const heading = random.range(-10_000, 10_000);
            const first = DirectionRay.fromHeading(origin, heading).exitPoint(
                bounds,
            );
            const second = DirectionRay.fromHeading(
                origin,
                heading + FULL_TURN_DEG,
            ).exitPoint(bounds);
            expect(first, `first ray; seed=${caseSeed}`).not.toBeNull();
            expect(second, `second ray; seed=${caseSeed}`).not.toBeNull();
            if (first === null || second === null) return;
            closePoint(first, second, caseSeed, "whole-turn ray");
        });
    });
});

const baseSample = (footRadiusMM: number): BaseSample => ({
    at: 0,
    contacts: { at: 0, points: [] },
    spec: {
        expectedCount: 3,
        footRadiusMM,
        outerDiameterMM: 2 * footRadiusMM,
    },
    pxPerMM: 1,
});

const positionSnapshot = (
    fittedRadiusPX: number,
    complete: boolean = true,
    confidence: number = 1,
): PositionSnapshot => ({
    sensed: true,
    complete,
    contactCount: 3,
    expectedCount: 3,
    centre: { x: 0, y: 0 },
    /* Added when Position gained shapeConfidence: the estimator is
       gated on the scale-free part of confidence, not on confidence
       itself. Kept equal so this stub's `confidence` knob still
       controls what the estimator sees. */
    shapeConfidence: confidence,
    fittedRadiusPX,
    residualPX: 0,
    confidence,
});

describe("PxPerMMEstimator properties", () => {
    it("never leaves its seed-relative bounds", () => {
        let firstFailure: string | null = null;
        forCases(SEED_SCALE, (random, caseSeed, index) => {
            const seed = random.range(0.1, 20);
            const policy = new PxPerMMPolicy();
            const estimator = new PxPerMMEstimator(seed, policy);
            const footRadiusMM = random.range(0.1, 1_000);
            const adversarial = [
                Number.NaN,
                Number.POSITIVE_INFINITY,
                Number.NEGATIVE_INFINITY,
                0,
                -random.range(1, 1e12),
                random.range(1, 1e12),
            ];
            const fittedRadiusPX = adversarial[index % adversarial.length];
            if (fittedRadiusPX === undefined) {
                throw new Error("Adversarial reading index escaped its array");
            }
            const actual = estimator.observe(
                positionSnapshot(fittedRadiusPX),
                baseSample(footRadiusMM),
            );
            const low = seed * (1 - policy.maxDrift);
            const high = seed * (1 + policy.maxDrift);
            if (!(actual >= low && actual <= high) && firstFailure === null) {
                firstFailure =
                    `seed=${caseSeed}; scaleSeed=${seed}; ` +
                    `fittedRadiusPX=${String(fittedRadiusPX)}; ` +
                    `footRadiusMM=${footRadiusMM}; result=${String(actual)}`;
            }
        });
        expect(
            firstFailure,
            firstFailure ?? "all cases stayed bounded",
        ).toBeNull();
    });

    it("converges toward a consistent true scale", () => {
        forCases(SEED_SCALE + 1, (random, caseSeed) => {
            const seed = random.range(0.5, 12);
            const direction = random.next() < 0.5 ? -1 : 1;
            const factor = 1 + direction * random.range(0.03, 0.1);
            const trueScale = seed * factor;
            const footRadiusMM = random.range(5, 100);
            const estimator = new PxPerMMEstimator(seed, new PxPerMMPolicy());
            const before = Math.abs(seed - trueScale);
            for (let sample = 0; sample < 200; sample += 1) {
                estimator.observe(
                    positionSnapshot(trueScale * footRadiusMM),
                    baseSample(footRadiusMM),
                );
            }
            const after = Math.abs(estimator.value - trueScale);
            expect(
                after,
                `scale convergence; seed=${caseSeed}; target=${trueScale}`,
            ).toBeLessThan(before);
        });
    });

    it("ignores incomplete and low-confidence readings", () => {
        forCases(SEED_SCALE + 2, (random, caseSeed) => {
            const seed = random.range(0.5, 12);
            const policy = new PxPerMMPolicy();
            const estimator = new PxPerMMEstimator(seed, policy);
            const footRadiusMM = random.range(5, 100);
            const fittedRadiusPX = random.range(1, 100_000);
            const sample = baseSample(footRadiusMM);
            const incomplete = estimator.observe(
                positionSnapshot(fittedRadiusPX, false, 1),
                sample,
            );
            const untrusted = estimator.observe(
                positionSnapshot(
                    fittedRadiusPX,
                    true,
                    policy.minConfidence - FLOAT_TOLERANCE,
                ),
                sample,
            );
            close(incomplete, seed, caseSeed, "incomplete scale");
            close(untrusted, seed, caseSeed, "untrusted scale");
            expect(
                estimator.sampleCount,
                `ignored sample count; seed=${caseSeed}`,
            ).toBe(0);
        });
    });
});
