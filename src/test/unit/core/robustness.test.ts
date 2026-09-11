/* Solver behaviour under reproducible table-like noise.
 *
 * Gaussian jitter, interrupted contacts and unrelated touches expose
 * failures that perfect geometric fixtures cannot. Seeds stay beside the
 * assertions because a rare bad frame is useful only when it can be replayed.
 */
import { describe, expect, it } from "vitest";
import {
    ApexHeadingSource,
    CentroidSolver,
    CircleFitSolver,
    Direction,
    DirectionPolicy,
    Move,
    MovePolicy,
    Position,
    PositionPolicy,
    PxPerMMEstimator,
    PxPerMMPolicy,
    Rotate,
    HeadingRotationSource,
    RotatePolicy,
    shortestAngleDiffDeg,
} from "../../../core/base";
import { ReplayContactSource } from "../../../core/contact";
import type {
    BaseSample,
    FootprintSpec,
    PositionSnapshot,
    Vec2,
} from "../../../core/base";
import type { ContactSet, ContactRecording } from "../../../core/contact";
import { synthesise, syntheticFootprintSpec } from "./synthesise";
import type { SynthesiseOptions, SyntheticFootprint } from "./synthesise";

const RECORDED_AT = "2026-09-08T12:00:00.000Z";
const PX_PER_MM = 4;
const JITTER_MM = 2;
const FRAME_MS = 16;
const SEED_DRAG = 0xd2a60001;
const SEED_DROPOUT = 0xd20f0001;
const SEED_PALM = 0xfa1a0001;
const SEED_ROTATE = 0x707a7e01;
const SEED_SCALE = 0x5ca1e001;
const SEED_NEIGHBOURS = 0x2b1ec701;
const SEED_CEILING_POSITION = 0xce110001;
const SEED_CEILING_APEX = 0xce110002;
const SEED_CEILING_ROTATE = 0xce110003;

const TRIAD: SyntheticFootprint = {
    kind: "triad",
    radiusMM: 40,
    apexOffsetDeg: 12,
};
const RING: SyntheticFootprint = {
    kind: "ring",
    radiusMM: 40,
    anglesDeg: [0, 90, 180, 270],
};
const TRIAD_SPEC = syntheticFootprintSpec(TRIAD, 80);
const RING_SPEC = syntheticFootprintSpec(RING, 80);

const sampleFrom = (
    frame: ContactSet,
    spec: FootprintSpec,
    pxPerMM: number = PX_PER_MM,
): BaseSample => ({
    at: frame.at,
    contacts: frame,
    spec,
    pxPerMM,
});

const replayFrames = (
    recording: ContactRecording,
    visit: (frame: ContactSet, index: number) => void,
): void => {
    const replay = new ReplayContactSource(recording);
    recording.frames.forEach((recorded, index) => {
        visit(replay.frame(recorded.at), index);
    });
};

const centreAt = (
    from: Vec2,
    to: Vec2,
    index: number,
    frameCount: number,
): Vec2 => {
    const progress = index / Math.max(1, frameCount - 1);
    return {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
    };
};

const requiredCentre = (
    snapshot: PositionSnapshot,
    seed: number,
    frame: number,
): Vec2 => {
    expect(
        snapshot.centre,
        `missing centre; seed=${seed}; frame=${frame}`,
    ).not.toBeNull();
    if (snapshot.centre === null) {
        throw new Error(`Missing centre; seed=${seed}; frame=${frame}`);
    }
    return snapshot.centre;
};

const baseOptions = (
    seed: number,
    footprint: SyntheticFootprint,
): Pick<
    SynthesiseOptions,
    | "seed"
    | "name"
    | "recordedAt"
    | "frameMS"
    | "startAt"
    | "pxPerMM"
    | "footprint"
> => ({
    seed,
    name: `noise-${seed}`,
    recordedAt: RECORDED_AT,
    frameMS: FRAME_MS,
    startAt: 0,
    pxPerMM: PX_PER_MM,
    footprint,
});

describe("synthetic recordings", () => {
    it("is deterministic and gives returning feet new lifetimes", () => {
        const options: SynthesiseOptions = {
            ...baseOptions(SEED_DROPOUT, TRIAD),
            frameCount: 8,
            path: {
                kind: "still",
                centrePX: { x: 400, y: 300 },
                rotationDeg: 0,
            },
            jitterMM: 0,
            dropouts: [
                {
                    object: "primary",
                    foot: 1,
                    fromFrame: 3,
                    toFrame: 4,
                },
            ],
        };
        const first = synthesise(options);
        const second = synthesise(options);
        expect(first).toEqual(second);

        const before = first.frames[2]?.points.find(
            (contact) => contact.id === 1,
        );
        const returned = first.frames[5]?.points.find(
            (contact) => contact.id > 2,
        );
        expect(before?.firstSeen).toBe(0);
        expect(returned?.firstSeen).toBe(5 * FRAME_MS);
        for (const frame of first.frames) {
            const ids = frame.points.map((contact) => contact.id);
            expect(ids).toEqual([...ids].sort((left, right) => left - right));
        }
    });
});

describe("Position under table noise", () => {
    it("does not flicker or leave its derived jitter bound on a drag", () => {
        const frameCount = 300;
        const from = { x: 250, y: 220 };
        const to = { x: 1_250, y: 720 };
        const recording = synthesise({
            ...baseOptions(SEED_DRAG, TRIAD),
            frameCount,
            path: {
                kind: "straight",
                fromPX: from,
                toPX: to,
                fromRotationDeg: 15,
                toRotationDeg: 15,
            },
            jitterMM: JITTER_MM,
        });
        const position = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        /* Each centroid coordinate averages three independent Gaussian
           errors. Five standard deviations in both axes gives this
           conservative radial envelope for the deterministic long run. */
        const boundPX =
            (5 * Math.SQRT2 * JITTER_MM * PX_PER_MM) / Math.sqrt(3);

        replayFrames(recording, (frame, index) => {
            position.update(sampleFrom(frame, TRIAD_SPEC));
            const snapshot = position.snapshot();
            expect(
                snapshot.sensed,
                `position flicker; seed=${SEED_DRAG}; frame=${index}`,
            ).toBe(true);
            const centre = requiredCentre(snapshot, SEED_DRAG, index);
            const expected = centreAt(from, to, index, frameCount);
            const error = Math.hypot(
                centre.x - expected.x,
                centre.y - expected.y,
            );
            expect(
                error,
                `centre error; seed=${SEED_DRAG}; frame=${index}`,
            ).toBeLessThanOrEqual(boundPX);
        });
    });

    it("stays sensed through a ring-foot dropout and returns smoothly", () => {
        const recording = synthesise({
            ...baseOptions(SEED_DROPOUT, RING),
            frameCount: 90,
            path: {
                kind: "still",
                centrePX: { x: 600, y: 400 },
                rotationDeg: 20,
            },
            jitterMM: 0.5,
            dropouts: [
                {
                    object: "primary",
                    foot: 2,
                    fromFrame: 40,
                    toFrame: 44,
                },
            ],
        });
        const position = new Position(
            new CircleFitSolver(),
            new PositionPolicy(),
        );
        const returnCentres: Vec2[] = [];

        replayFrames(recording, (frame, index) => {
            position.update(sampleFrom(frame, RING_SPEC));
            const snapshot = position.snapshot();
            if (index >= 40 && index <= 44) {
                expect(
                    snapshot.sensed,
                    `dropout flicker; seed=${SEED_DROPOUT}; frame=${index}`,
                ).toBe(true);
                expect(snapshot.complete).toBe(false);
            }
            if (index === 44) {
                returnCentres.push(
                    requiredCentre(snapshot, SEED_DROPOUT, index),
                );
            }
            if (index === 45) {
                returnCentres.push(
                    requiredCentre(snapshot, SEED_DROPOUT, index),
                );
            }
        });

        const beforeReturn = returnCentres[0];
        const afterReturn = returnCentres[1];
        if (beforeReturn === undefined || afterReturn === undefined) {
            throw new Error(`Return frames missing; seed=${SEED_DROPOUT}`);
        }
        const jump = Math.hypot(
            afterReturn.x - beforeReturn.x,
            afterReturn.y - beforeReturn.y,
        );
        /* Three remaining quarter-ring feet keep the fit conditioned;
           eight jitter sigmas allows independent noise on both sides
           of the returning frame without accepting a visible jump. */
        expect(jump, `return jump; seed=${SEED_DROPOUT}`).toBeLessThanOrEqual(
            8 * 0.5 * PX_PER_MM,
        );
    });

    it("never recognises a lone palm or widely spread fingers", () => {
        const recording = synthesise({
            ...baseOptions(SEED_PALM, TRIAD),
            frameCount: 10,
            path: {
                kind: "still",
                centrePX: { x: 400, y: 300 },
                rotationDeg: 0,
            },
            jitterMM: 0,
            dropouts: [0, 1, 2].map((foot) => ({
                object: "primary" as const,
                foot,
                fromFrame: 0,
                toFrame: 9,
            })),
            strayContacts: [
                {
                    positionPX: { x: 400, y: 300 },
                    radiusPX: 90,
                    fromFrame: 0,
                    toFrame: 4,
                },
                {
                    positionPX: { x: 100, y: 100 },
                    radiusPX: 9,
                    fromFrame: 5,
                    toFrame: 9,
                },
                {
                    positionPX: { x: 700, y: 100 },
                    radiusPX: 9,
                    fromFrame: 5,
                    toFrame: 9,
                },
                {
                    positionPX: { x: 400, y: 700 },
                    radiusPX: 9,
                    fromFrame: 5,
                    toFrame: 9,
                },
            ],
        });
        const position = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        replayFrames(recording, (frame, index) => {
            position.update(sampleFrom(frame, TRIAD_SPEC));
            expect(
                position.snapshot().sensed,
                `palm recognised; seed=${SEED_PALM}; frame=${index}`,
            ).toBe(false);
        });
    });
});

describe("rotation and scale under table noise", () => {
    it("accumulates a full noisy turn across the wrap point", () => {
        const recording = synthesise({
            ...baseOptions(SEED_ROTATE, TRIAD),
            frameCount: 181,
            path: {
                kind: "rotate",
                centrePX: { x: 650, y: 450 },
                fromDeg: 350,
                toDeg: 710,
            },
            jitterMM: JITTER_MM,
        });
        const position = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        const direction = new Direction(
            position,
            new ApexHeadingSource(new DirectionPolicy()),
        );
        const rotate = new Rotate(
            new HeadingRotationSource(direction, new RotatePolicy()),
            new RotatePolicy(),
            direction,
        );

        replayFrames(recording, (frame) => {
            const sample = sampleFrom(frame, TRIAD_SPEC);
            position.update(sample);
            direction.update(sample);
            rotate.update(sample);
        });
        expect(
            rotate.snapshot().deltaTotalDeg,
            `noisy turn; seed=${SEED_ROTATE}`,
        ).toBeCloseTo(360, 0);
    });

    it("calibrates toward the true scale from a jittery puck", () => {
        const seedScale = 3.6;
        const recording = synthesise({
            ...baseOptions(SEED_SCALE, TRIAD),
            frameCount: 600,
            path: {
                kind: "still",
                centrePX: { x: 600, y: 400 },
                rotationDeg: 25,
            },
            jitterMM: JITTER_MM,
        });
        const position = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        const estimator = new PxPerMMEstimator(seedScale, new PxPerMMPolicy());
        const startingError = Math.abs(seedScale - PX_PER_MM);

        replayFrames(recording, (frame) => {
            const sample = sampleFrom(frame, TRIAD_SPEC, estimator.value);
            position.update(sample);
            estimator.observe(position.snapshot(), sample);
        });
        const finalError = Math.abs(estimator.value - PX_PER_MM);
        expect(
            finalError,
            `scale drift; seed=${SEED_SCALE}; value=${estimator.value}`,
        ).toBeLessThan(startingError);
    });
});

describe("nearby objects", () => {
    it("keeps two pucks separable once the frame is grouped", () => {
        const offsetPX = { x: 180, y: 0 };
        const recording = synthesise({
            ...baseOptions(SEED_NEIGHBOURS, TRIAD),
            frameCount: 30,
            path: {
                kind: "still",
                centrePX: { x: 500, y: 400 },
                rotationDeg: 0,
            },
            jitterMM: 0.5,
            secondObject: {
                footprint: TRIAD,
                offsetPX,
                rotationOffsetDeg: 40,
            },
        });
        const primary = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        const secondary = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        replayFrames(recording, (frame, index) => {
            const primaryPoints = frame.points.filter(
                (contact) => contact.id < TRIAD_SPEC.expectedCount,
            );
            const secondaryPoints = frame.points.filter(
                (contact) => contact.id >= TRIAD_SPEC.expectedCount,
            );
            primary.update(
                sampleFrom(
                    { at: frame.at, points: primaryPoints },
                    TRIAD_SPEC,
                ),
            );
            secondary.update(
                sampleFrom(
                    { at: frame.at, points: secondaryPoints },
                    TRIAD_SPEC,
                ),
            );
            expect(
                primary.snapshot().contactCount,
                `primary grouping; seed=${SEED_NEIGHBOURS}; frame=${index}`,
            ).toBe(TRIAD_SPEC.expectedCount);
            expect(
                secondary.snapshot().contactCount,
                `secondary grouping; seed=${SEED_NEIGHBOURS}; frame=${index}`,
            ).toBe(TRIAD_SPEC.expectedCount);
            expect(primary.snapshot().sensed).toBe(true);
            expect(secondary.snapshot().sensed).toBe(true);

            const first = requiredCentre(
                primary.snapshot(),
                SEED_NEIGHBOURS,
                index,
            );
            const second = requiredCentre(
                secondary.snapshot(),
                SEED_NEIGHBOURS,
                index,
            );
            expect(
                Math.abs(second.x - first.x - offsetPX.x),
                `separation; seed=${SEED_NEIGHBOURS}; frame=${index}`,
            ).toBeLessThanOrEqual(10);
        });
    });
});

const positionFailsAt = (jitterMM: number): boolean => {
    const recording = synthesise({
        ...baseOptions(SEED_CEILING_POSITION, TRIAD),
        frameCount: 240,
        path: {
            kind: "straight",
            fromPX: { x: 250, y: 250 },
            toPX: { x: 1_100, y: 650 },
            fromRotationDeg: 20,
            toRotationDeg: 20,
        },
        jitterMM,
    });
    const position = new Position(new CentroidSolver(), new PositionPolicy());
    let failed = false;
    replayFrames(recording, (frame) => {
        position.update(sampleFrom(frame, TRIAD_SPEC));
        if (!position.snapshot().sensed) failed = true;
    });
    return failed;
};

const apexFailsAt = (jitterMM: number): boolean => {
    const expectedHeading = 25;
    const recording = synthesise({
        ...baseOptions(SEED_CEILING_APEX, TRIAD),
        frameCount: 240,
        path: {
            kind: "still",
            centrePX: { x: 600, y: 400 },
            rotationDeg: expectedHeading,
        },
        jitterMM,
    });
    const solver = new CentroidSolver();
    const source = new ApexHeadingSource(new DirectionPolicy());
    let failed = false;
    replayFrames(recording, (frame) => {
        const fit = solver.solve(frame.points);
        if (fit === null) {
            failed = true;
            return;
        }
        const heading = source.heading(frame.points, fit.centre);
        if (
            heading === null ||
            Math.abs(
                shortestAngleDiffDeg(expectedHeading, heading.headingDeg),
            ) > 15
        ) {
            failed = true;
        }
    });
    return failed;
};

const rotateFailsAt = (jitterMM: number): boolean => {
    const recording = synthesise({
        ...baseOptions(SEED_CEILING_ROTATE, TRIAD),
        frameCount: 181,
        path: {
            kind: "rotate",
            centrePX: { x: 600, y: 400 },
            fromDeg: 0,
            toDeg: 360,
        },
        jitterMM,
    });
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
    replayFrames(recording, (frame) => {
        const sample = sampleFrom(frame, TRIAD_SPEC);
        position.update(sample);
        direction.update(sample);
        move.update(sample);
        rotate.update(sample);
    });
    return Math.abs(rotate.snapshot().deltaTotalDeg - 360) > 10;
};

const firstFailure = (
    failsAt: (jitterMM: number) => boolean,
): number | null => {
    for (let quarterMM = 0; quarterMM <= 80; quarterMM += 1) {
        const jitterMM = quarterMM / 4;
        if (failsAt(jitterMM)) return jitterMM;
    }
    return null;
};

describe("measured noise ceilings", () => {
    it("finds a reproducible first failure for each oriented trait", () => {
        const position = firstFailure(positionFailsAt);
        const apex = firstFailure(apexFailsAt);
        const rotate = firstFailure(rotateFailsAt);
        expect(
            position,
            "Position stayed perfect through 20 mm",
        ).not.toBeNull();
        expect(apex, "Apex stayed perfect through 20 mm").not.toBeNull();
        expect(rotate, "Rotate stayed perfect through 20 mm").not.toBeNull();
        if (position !== null) expect(position).toBeGreaterThanOrEqual(4.75);
        if (apex !== null) expect(apex).toBeGreaterThanOrEqual(1.5);
        if (rotate !== null) expect(rotate).toBeGreaterThanOrEqual(1.75);
    });
});
