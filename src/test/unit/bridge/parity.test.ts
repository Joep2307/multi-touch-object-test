/* The two pipelines, on real recordings.
 *
 * Phase 6 of `todo/TODO.md` asks for parity driven at the table. This
 * is as far as that can be taken without one: the seven recordings
 * made on 9 September 2026 replayed through both the old geometry and
 * the new base, frame by frame, comparing the numbers they disagree
 * about rather than the numbers they were each designed to produce.
 *
 * It is not a substitute for the table. What it cannot check is
 * whether the drawn ring sits on the physical rim, because that is a
 * question about a screen. What it can check is that the two ways of
 * reading the same contact points give the same answer, which is the
 * part that would otherwise be discovered on the afternoon.
 */
import {
    ApexHeadingSource,
    CentroidSolver,
    Direction,
    DirectionPolicy,
    FootprintCompletion,
    FootprintCompletionPolicy,
    PointMatchRotationSource,
    Position,
    PositionPolicy,
    Rotate,
    RotatePolicy,
} from "../../../core/base";
import { describe as describeTriangle } from "../../../puck/geometry";
import { describe, expect, it } from "vitest";
import type { BaseSample, FootprintSpec } from "../../../core/base";
import type { ContactRecording, SensedContact } from "../../../core/contact";
import stillPuck from "../core/fixtures/contacts-table-19-18529.json";
import turningPuck from "../core/fixtures/contacts-table-44-43582.json";
import slidingPuck from "../core/fixtures/contacts-table-68-68030.json";
import palmAndSleeve from "../core/fixtures/contacts-table-292-291704.json";
import emptyGlass from "../core/fixtures/contacts-table-2-1739.json";
import droppingPuck from "../core/fixtures/contacts-table-122-122231.json";
import manyFeet from "../core/fixtures/contacts-table-214-214278.json";

/* Measured at the table on 9 September 2026, not assumed. */
const PX_PER_MM = 2.02;
const SPEC: FootprintSpec = {
    expectedCount: 3,
    footRadiusMM: 34.6,
    footRadiusSpreadMM: 0.95,
    outerDiameterMM: 80,
};

type Frame = { readonly at: number; readonly points: SensedContact[] };

const framesOf = (recording: ContactRecording): readonly Frame[] =>
    recording.frames.map((frame) => ({
        at: frame.at,
        points: frame.points
            .filter((p) => p.status !== "ended")
            .map((p) => ({
                id: p.id,
                x: p.x,
                y: p.y,
                radiusPX: p.radiusPX,
                firstSeen: p.firstSeen,
                lastSeen: p.lastSeen,
            })),
    }));

const rig = (): {
    position: Position;
    direction: Direction;
    step: (frame: Frame) => void;
} => {
    const position = new Position(new CentroidSolver(), new PositionPolicy());
    const direction = new Direction(
        position,
        new ApexHeadingSource(new DirectionPolicy()),
    );
    return {
        position,
        direction,
        step(frame) {
            const sample: BaseSample = {
                at: frame.at,
                contacts: { at: frame.at, points: frame.points },
                spec: SPEC,
                pxPerMM: PX_PER_MM,
            };
            position.update(sample);
            direction.update(sample);
        },
    };
};

const RECORDINGS: readonly [string, ContactRecording][] = [
    ["a still puck", stillPuck as ContactRecording],
    ["a puck turned a full circle", turningPuck as ContactRecording],
    ["a puck slid across the table", slidingPuck as ContactRecording],
];

describe("the two pipelines agree on where the puck is", () => {
    for (const [name, recording] of RECORDINGS) {
        it(`on ${name}`, () => {
            const r = rig();
            let compared = 0;
            let worstPX = 0;
            for (const frame of framesOf(recording)) {
                r.step(frame);
                const [p1, p2, p3] = frame.points;
                if (frame.points.length !== 3 || !p1 || !p2 || !p3) continue;
                const old = describeTriangle(p1, p2, p3);
                const centre = r.position.snapshot().centre;
                if (!old || centre === null) continue;
                compared += 1;
                worstPX = Math.max(
                    worstPX,
                    Math.hypot(centre.x - old.cx, centre.y - old.cy),
                );
            }
            expect(compared).toBeGreaterThan(100);
            /* Both take the centroid of the same three points, so they
               should agree to floating-point noise. Anything larger
               would mean one of them had quietly started measuring
               something else. */
            expect(worstPX).toBeLessThan(1e-9);
        });
    }
});

/* How far ahead the winning apex candidate is of the runner-up, as a
   fraction of its own deviation. Zero means the footprint has two
   equally good noses and whichever is chosen is a coin flip. */
const apexMargin = (points: readonly SensedContact[]): number | null => {
    const [a, b, c] = points;
    if (!a || !b || !c) return null;
    const h = Math.hypot;
    const side = [
        h(b.x - c.x, b.y - c.y),
        h(a.x - c.x, a.y - c.y),
        h(a.x - b.x, a.y - b.y),
    ];
    const deviation = side
        .map((own, i) => {
            const others =
                ((side[(i + 1) % 3] ?? 0) + (side[(i + 2) % 3] ?? 0)) / 2;
            return others <= 0 ? 0 : Math.abs(own - others) / others;
        })
        .sort((x, y) => y - x);
    const best = deviation[0] ?? 0;
    const runnerUp = deviation[1] ?? 0;
    return best <= 0 ? null : (best - runnerUp) / best;
};

describe("which foot is the nose", () => {
    it("is the same foot for both pipelines on a still puck", () => {
        const r = rig();
        let compared = 0;
        let agreed = 0;
        for (const frame of framesOf(stillPuck as ContactRecording)) {
            r.step(frame);
            const [p1, p2, p3] = frame.points;
            if (frame.points.length !== 3 || !p1 || !p2 || !p3) continue;
            const old = describeTriangle(p1, p2, p3);
            const now = r.direction.snapshot();
            if (!old || !now.known || now.reference === null) continue;
            compared += 1;
            if (
                Math.hypot(
                    now.reference.x - old.anchor.x,
                    now.reference.y - old.anchor.y,
                ) < 1e-9
            ) {
                agreed += 1;
            }
        }
        expect(compared).toBeGreaterThan(400);
        expect(agreed).toBe(compared);
    });

    it("is decided by a coin flip on the real pucks", () => {
        /* The finding this file exists for, and it is not a bug in
           either pipeline.
         *
         * The old geometry names the vertex opposite the **longest**
         * side; the new one names the vertex opposite the side that
         * deviates most from the mean of the other two. On an isosceles
         * footprint those are the same foot. The real pucks are not
         * isosceles: their sides measure 116, 121 and 126 px, so the
         * longest side deviates by 6.33% and the shortest by 6.07% —
         * a margin of four per cent, against a measurement noise of
         * about 1.6%.
         *
         * The still puck is worse: its two candidates are **1.7%**
         * apart, every frame, which is a footprint that is very nearly
         * equilateral. It does not flicker, because the puck is not
         * moving — it picks one foot and holds it. That is the
         * dangerous shape of this failure. It looks reliable, and the
         * same puck put down again may name a different foot.
         *
         * The synthetic footprint the model was designed around has a
         * margin of 45%: twenty-six times the still puck's. No
         * threshold closes that gap, which is why the answer in
         * `todo/TODO.md` is to make the pucks, not to change the
         * code. */
        const margins: number[] = [];
        for (const frame of framesOf(stillPuck as ContactRecording)) {
            if (frame.points.length !== 3) continue;
            const margin = apexMargin(frame.points);
            if (margin !== null) margins.push(margin);
        }
        expect(margins.length).toBeGreaterThan(400);
        const worst = Math.max(...margins);
        expect(worst).toBeLessThan(0.03);

        /* And what a footprint that can be read looks like. */
        const designed = apexMargin(
            [0, 132, 228].map((deg, id) => {
                const rad = (deg * Math.PI) / 180;
                return {
                    id,
                    x: 40 * Math.cos(rad),
                    y: 40 * Math.sin(rad),
                    radiusPX: 0,
                    firstSeen: 0,
                    lastSeen: 0,
                };
            }),
        );
        expect(designed).toBeGreaterThan(0.4);
    });

    it("stays on the same foot for as long as it is on the glass", () => {
        /* The half of the coin flip that *is* fixable. The feet of a
           puck do not change identity while it lies there; only the
           measurement wobbles. Before the apex was held, these three
           recordings hopped six, seven and five times; now they hop
           none, and the heading is reported on exactly as many frames
           as before. */
        for (const [, recording] of RECORDINGS) {
            const r = rig();
            let hops = 0;
            let reported = 0;
            let last: number | null = null;
            for (const frame of framesOf(recording)) {
                r.step(frame);
                const now = r.direction.snapshot();
                if (!now.known || now.reference === null) {
                    last = null;
                    continue;
                }
                reported += 1;
                const foot = frame.points.findIndex(
                    (p) =>
                        now.reference !== null &&
                        Math.hypot(
                            p.x - now.reference.x,
                            p.y - now.reference.y,
                        ) < 1e-9,
                );
                if (last !== null && foot >= 0 && foot !== last) hops += 1;
                if (foot >= 0) last = foot;
            }
            expect(reported).toBeGreaterThan(100);
            expect(hops).toBe(0);
        }
    });

    it("forgets its choice when the object leaves the glass", () => {
        /* An object that has left takes its nose with it. The next one
           to land in the same place is a different object. */
        const r = rig();
        for (const frame of framesOf(stillPuck as ContactRecording)) {
            r.step(frame);
            if (r.direction.snapshot().known) break;
        }
        expect(r.direction.snapshot().known).toBe(true);
        r.direction.reset();
        expect(r.direction.snapshot().known).toBe(false);
    });

    it("no longer decides how far a puck has turned", () => {
        /* Which is why the coin flip above is survivable.
           `PointMatchRotationSource` matches feet to the previous
           frame, so a nose that hops costs a moment's wrong heading
           rather than a corrupted turn. Before that, this measurement
           would have been a reason to stop. */
        expect(new PointMatchRotationSource(new RotatePolicy()).id).toBe(
            "pointMatch",
        );
    });
});

describe("neither pipeline sees a puck that is not there", () => {
    it("on a palm and a sleeve on the glass", () => {
        /* The safety property, and the one worth having most. The old
           pipeline needs a template to match; the new one needs
           `sensed`. Neither may be fooled by a hand. */
        const r = rig();
        let frames = 0;
        let sensed = 0;
        for (const frame of framesOf(palmAndSleeve as ContactRecording)) {
            r.step(frame);
            frames += 1;
            if (r.position.snapshot().sensed) sensed += 1;
        }
        expect(frames).toBeGreaterThan(400);
        expect(sensed).toBe(0);
    });
});

describe("the new pipeline reports a puck when the old one could", () => {
    it("loses no still puck the old geometry would have described", () => {
        /* The regression this guards: `sensed` going quiet on a puck
           that is plainly there. It is what the apex threshold did
           before it came down to 0.06 — 460 three-foot frames, and a
           heading on none of them. */
        const r = rig();
        let describable = 0;
        let sensed = 0;
        for (const frame of framesOf(stillPuck as ContactRecording)) {
            r.step(frame);
            const [p1, p2, p3] = frame.points;
            if (frame.points.length !== 3 || !p1 || !p2 || !p3) continue;
            if (!describeTriangle(p1, p2, p3)) continue;
            describable += 1;
            if (r.position.snapshot().sensed) sensed += 1;
        }
        expect(describable).toBeGreaterThan(400);
        expect(sensed).toBe(describable);
    });
});

/* ── Holding a puck on two feet, on the recordings ───────────────
 *
 * The same `Position`, with `FootprintCompletion` in front of it, which
 * is where `Base.update` puts it. What is being measured is how often a
 * two-foot frame that used to be nothing at all becomes a reading.
 */
const heldRig = (): {
    position: Position;
    step: (frame: Frame) => void;
    reconstructed: () => number;
} => {
    const position = new Position(new CentroidSolver(), new PositionPolicy());
    const completion = new FootprintCompletion(
        new FootprintCompletionPolicy(),
    );
    let reconstructed = 0;
    return {
        position,
        reconstructed: () => reconstructed,
        step(frame) {
            const contacts = completion.complete(
                { at: frame.at, points: frame.points },
                SPEC,
            );
            const sample: BaseSample = {
                at: frame.at,
                contacts,
                spec: SPEC,
                pxPerMM: PX_PER_MM,
            };
            position.update(sample);
            completion.remember(contacts, position.snapshot());
            if (position.snapshot().held) reconstructed += 1;
        },
    };
};

/* Frames where exactly two contacts are down, between two frames where
   three or more were: a genuine dropout rather than an empty table. */
const dropoutFrames = (frames: readonly Frame[]): number => {
    let count = 0;
    for (let i = 1; i < frames.length - 1; i += 1) {
        if (frames[i]?.points.length !== 2) continue;
        let before = i - 1;
        while (before >= 0 && (frames[before]?.points.length ?? 0) < 3) {
            before -= 1;
        }
        let after = i + 1;
        while (
            after < frames.length &&
            (frames[after]?.points.length ?? 0) < 3
        ) {
            after += 1;
        }
        if (before >= 0 && after < frames.length) count += 1;
    }
    return count;
};

describe("a puck holds on while two of its feet are down", () => {
    it("is what the recordings are actually short of", () => {
        /* Worth stating plainly, because the plan this was built from
           got it wrong. "Three feet are present on only 57 to 64 per
           cent of frames" is arithmetically right and misleading: most
           of the shortfall is an **empty table**, not a puck with a
           foot missing. On the still puck, 238 of 717 frames have no
           contacts at all and only 7 have two.
         *
         * So the win here is not the two-thirds of a session the plan
         * expected. It is every dropout there actually is. */
        const still = framesOf(stillPuck as ContactRecording);
        const empty = still.filter((f) => f.points.length === 0).length;
        expect(empty).toBeGreaterThan(200);
        expect(dropoutFrames(still)).toBeLessThan(10);

        /* And a recording that does drop out, properly. */
        const dropping = framesOf(droppingPuck as ContactRecording);
        expect(dropoutFrames(dropping)).toBeGreaterThan(60);
    });

    it("reads a puck on every frame of a long dropout", () => {
        /* 82 two-foot frames in two runs, and before this they were 82
           frames of nothing: `Move` reset, the swipe was lost, and the
           puck came back as though it had never gone anywhere. */
        const frames = framesOf(droppingPuck as ContactRecording);
        const plain = rig();
        const held = heldRig();
        let plainSensed = 0;
        let heldSensed = 0;
        for (const frame of frames) {
            plain.step(frame);
            held.step(frame);
            if (plain.position.snapshot().sensed) plainSensed += 1;
            if (held.position.snapshot().sensed) heldSensed += 1;
        }
        expect(held.reconstructed()).toBe(dropoutFrames(frames));
        expect(heldSensed - plainSensed).toBe(held.reconstructed());
    });

    it("still reads the full circle as a full circle", () => {
        const frames = framesOf(turningPuck as ContactRecording);
        const rotate = new Rotate(
            new PointMatchRotationSource(new RotatePolicy()),
            new RotatePolicy(),
        );
        const completion = new FootprintCompletion(
            new FootprintCompletionPolicy(),
        );
        const position = new Position(
            new CentroidSolver(),
            new PositionPolicy(),
        );
        for (const frame of frames) {
            const contacts = completion.complete(
                { at: frame.at, points: frame.points },
                SPEC,
            );
            const sample: BaseSample = {
                at: frame.at,
                contacts,
                spec: SPEC,
                pxPerMM: PX_PER_MM,
            };
            position.update(sample);
            completion.remember(contacts, position.snapshot());
            rotate.update(sample);
        }
        const turned = Math.abs(rotate.snapshot().deltaTotalDeg);
        expect(turned).toBeGreaterThan(330);
        expect(turned).toBeLessThan(375);
    });

    it("is still not fooled by a palm, a sleeve or an empty table", () => {
        /* The safety property, and the one this feature could most
           easily have cost. Completion can only ever add feet to a
           footprint it has already seen whole and believed, so a
           recording that was never sensed cannot start being sensed. */
        for (const recording of [
            palmAndSleeve as ContactRecording,
            emptyGlass as ContactRecording,
            manyFeet as ContactRecording,
        ]) {
            const held = heldRig();
            let sensed = 0;
            for (const frame of framesOf(recording)) {
                held.step(frame);
                if (held.position.snapshot().sensed) sensed += 1;
            }
            expect(sensed).toBe(0);
            expect(held.reconstructed()).toBe(0);
        }
    });
});
