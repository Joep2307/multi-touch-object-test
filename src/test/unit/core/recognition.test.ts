/* The recognition layer, in the model's terms.
 *
 * Phase A of todo/TODO-interaction-model.md: a contact knows whether
 * it is new or gone, a kind can be recognised in more than one way,
 * presence is projected onto the three states the model reports, and
 * a movement becomes a gesture from definitions rather than from
 * thresholds baked into a trait.
 *
 * The gesture tests are driven with hand-built base snapshots rather
 * than by moving synthetic feet around. That is deliberate: what is
 * under test is the judgement, not the kinematics, and thirty frames
 * of contacts to produce one shake would be testing `Move` again with
 * the answer three layers away.
 */
import { describe, expect, it } from "vitest";
import {
    CircleFitSolver,
    footprintFrom,
    AccelerationPolicy,
    DirectionPolicy,
    MotionHistoryPolicy,
    MovePolicy,
    FootprintCompletionPolicy,
    PositionPolicy,
    PxPerMMEstimator,
    PxPerMMPolicy,
    RotatePolicy,
} from "../../../core/base";
import { PointerContactSource } from "../../../core/contact";
import {
    GestureRecogniser,
    defaultGestureDefinitions,
} from "../../../core/gesture";
import {
    Apertured,
    BaseFactory,
    Passive,
    Placeable,
    Rotatable,
    Tappable,
    affordanceNames,
    instanceStatusOf,
    matchSignature,
    signatureFrom,
} from "../../../core/physical";
import type { BaseSnapshot, FootprintSpec } from "../../../core/base";
import type { GestureId, GestureResult } from "../../../core/gesture";
import type { SensedContact } from "../../../core/contact";
import type {
    BasePolicies,
    KindId,
    PhysicalKindDefinition,
    PhysicalSignature,
    PresenceState,
    SignatureId,
} from "../../../core/physical";

const POLICIES: BasePolicies = {
    position: new PositionPolicy(),
    completion: new FootprintCompletionPolicy(),
    direction: new DirectionPolicy(),
    move: new MovePolicy(),
    rotate: new RotatePolicy(),
    motionHistory: new MotionHistoryPolicy(),
    acceleration: new AccelerationPolicy(),
};

const PX_PER_MM = 4;
const signatureId = (s: string): SignatureId => s as SignatureId;

describe("ContactStatus", () => {
    it("calls a touch started, then active, then ended exactly once", () => {
        const src = new PointerContactSource();
        src.down(1, 10, 20, 4, 0);
        expect(src.frame(0).points[0]?.status).toBe("started");

        src.move(1, 12, 20, 4, 16);
        const second = src.frame(16);
        expect(second.points[0]?.status).toBe("active");
        expect(second.ended).toHaveLength(0);

        src.up(1);
        const third = src.frame(32);
        expect(third.points).toHaveLength(0);
        expect(third.ended.map((c) => c.status)).toEqual(["ended"]);

        /* The announcement is an event, not a state. Repeating it
           would make every stale touch look live. */
        expect(src.frame(48).ended).toHaveLength(0);
    });

    it("keeps a lifted contact out of what is on the glass", () => {
        /* The whole reason `ended` is a separate list. Anything that
           counts feet cannot tell a lifted one from a present one, so
           a puck that had just lost a foot would read as complete for
           exactly one frame. */
        const src = new PointerContactSource();
        src.down(1, 0, 0, 4, 0);
        src.down(2, 50, 0, 4, 0);
        src.frame(0);
        src.up(2);
        const frame = src.frame(16);
        expect(frame.points).toHaveLength(1);
        expect(frame.ended).toHaveLength(1);
    });

    it("says nothing ended when the table is reset under a finger", () => {
        /* A reset is not a lift. Announcing one would fire a tap for
           every finger on the glass at the moment it was cleared. */
        const src = new PointerContactSource();
        src.down(1, 0, 0, 4, 0);
        src.frame(0);
        src.clear();
        expect(src.frame(16).ended).toHaveLength(0);
    });
});

describe("a kind with two signatures", () => {
    /* Three feet in a triangle, or five on a ring: one object, two
       ways of reading it. Which one is being used decides the solver
       and the heading source, which is why the family lives on the
       signature and not on the kind. */
    const triadFeetMM = [0, 132, 228].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return { x: 40 * Math.cos(rad), y: 40 * Math.sin(rad) };
    });
    const ringFeetMM = [0, 70, 150, 210, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return { x: 34 * Math.cos(rad), y: 34 * Math.sin(rad) };
    });

    const TRIAD = signatureFrom(
        signatureId("both/triad"),
        "triad",
        triadFeetMM,
        80,
        5,
    );
    const RING = signatureFrom(
        signatureId("both/ring"),
        "ring",
        ringFeetMM,
        80,
        5,
    );
    const KIND: PhysicalKindDefinition = {
        id: "both" as KindId,
        label: "Two ways",
        signatures: [TRIAD, RING],
        affordances: [new Rotatable(), new Tappable(), new Apertured()],
        legacy: false,
    };

    const feetOf = (
        mm: readonly { x: number; y: number }[],
    ): SensedContact[] =>
        mm.map((foot, i) => ({
            id: i,
            x: 400 + foot.x * PX_PER_MM,
            y: 300 + foot.y * PX_PER_MM,
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: 0,
        }));

    const read = (
        signature: PhysicalSignature,
        points: readonly SensedContact[],
    ): { count: number; confidence: number } => {
        const factory = new BaseFactory(
            new PxPerMMEstimator(PX_PER_MM, new PxPerMMPolicy()),
            POLICIES,
        );
        const base = factory.create(signature);
        base.update(0, { at: 0, points }, signature.geometry);
        const position = base.position.snapshot();
        return {
            count: position.expectedCount,
            confidence: position.confidence,
        };
    };

    it("holds both ways of reading one object", () => {
        /* One kind, not two. A puck that can be read as a triad or as
           a ring is still one manufactured thing, and having to
           register it twice would make every question about it a
           question about which registration you meant. */
        expect(KIND.signatures).toHaveLength(2);
        expect(KIND.signatures.map((s) => s.family)).toEqual([
            "triad",
            "ring",
        ]);
    });

    it("derives each signature's count from its own geometry", () => {
        expect(TRIAD.contactCount).toBe(3);
        expect(RING.contactCount).toBe(5);
        expect(TRIAD.geometry.expectedCount).toBe(TRIAD.contactCount);
        expect(RING.geometry.expectedCount).toBe(RING.contactCount);
    });

    it("reads the object both ways, each by its own signature", () => {
        const triad = read(TRIAD, feetOf(triadFeetMM));
        const ring = read(RING, feetOf(ringFeetMM));
        expect(triad.count).toBe(3);
        expect(ring.count).toBe(5);
        expect(triad.confidence).toBeCloseTo(1, 6);
        expect(ring.confidence).toBeCloseTo(1, 6);
    });

    it("picks the signature that explains these feet", () => {
        /* Only ever within one kind. Deciding which *kind* a footprint
           is belongs to the recogniser that already does it, and a
           second opinion about that is how a table ends up with two
           answers and no way to tell which it acted on. */
        const triad = matchSignature(
            KIND,
            feetOf(triadFeetMM),
            PX_PER_MM,
            new PositionPolicy(),
        );
        const ring = matchSignature(
            KIND,
            feetOf(ringFeetMM),
            PX_PER_MM,
            new PositionPolicy(),
        );
        expect(triad?.signature.id).toBe("both/triad");
        expect(ring?.signature.id).toBe("both/ring");
    });

    it("says how far ahead the winner was", () => {
        /* Reported rather than judged here: how sure is sure enough
           is a question for whoever asked. */
        const match = matchSignature(
            KIND,
            feetOf(triadFeetMM),
            PX_PER_MM,
            new PositionPolicy(),
        );
        expect(match?.margin).toBeGreaterThan(0.5);
    });

    it("says nothing at all about a handful of fingers", () => {
        const scattered = [
            { x: 0, y: 0 },
            { x: 200, y: 30 },
            { x: 90, y: 260 },
        ];
        expect(
            matchSignature(
                KIND,
                feetOf(scattered),
                PX_PER_MM,
                new PositionPolicy(),
            ),
        ).toBeNull();
    });

    it("is far less sure when read by the wrong signature", () => {
        /* Confidence, not `sensed`. `sensed` only asks whether the
           reading is above the floor, and a five-foot ring read as a
           triad clears it — the feet really are roughly the right
           distance apart. What separates the two readings is how
           well each fits, which is what a matcher would compare.
           Building that matcher waits for a kind that genuinely has
           two signatures; inventing one now would be a second
           recogniser competing with the one the table already runs. */
        const right = read(TRIAD, feetOf(triadFeetMM)).confidence;
        const wrong = read(TRIAD, feetOf(ringFeetMM)).confidence;
        expect(wrong).toBeLessThan(right / 4);
    });
});

describe("InstanceStatus", () => {
    const cases: readonly [PresenceState, boolean, string][] = [
        ["placed", true, "detected"],
        ["placed", false, "missing"],
        ["lifted", false, "missing"],
        ["lifted", true, "missing"],
        ["gone", false, "removed"],
        ["unseen", false, "removed"],
    ];

    for (const [state, sensed, expected] of cases) {
        it(`reports ${state} + ${String(sensed)} as ${expected}`, () => {
            expect(instanceStatusOf(state, sensed)).toBe(expected);
        });
    }

    it("separates being here from being seen", () => {
        /* The reason the projection takes this frame's measurement as
           well as the presence state: a puck holding on through a
           dropout is still placed, but nothing is looking at it. */
        expect(instanceStatusOf("placed", true)).not.toBe(
            instanceStatusOf("placed", false),
        );
    });
});

describe("affordanceNames", () => {
    const kindWith = (
        ...affordances: PhysicalKindDefinition["affordances"]
    ): PhysicalKindDefinition => ({
        id: "k" as KindId,
        label: "K",
        signatures: [
            signatureFrom(signatureId("k/triad"), "triad", [], 80, 5),
        ],
        affordances,
        legacy: false,
    });

    it("names a puck the way a programme file would", () => {
        expect(
            affordanceNames(
                kindWith(new Rotatable(), new Tappable(), new Apertured()),
            ),
        ).toEqual(["movable", "rotatable", "tappable", "viewThrough"]);
    });

    it("calls anything not passive movable", () => {
        expect(affordanceNames(kindWith(new Passive()))).toEqual([]);
    });

    it("carries placeable through, for the regions that will ask", () => {
        expect(affordanceNames(kindWith(new Placeable()))).toEqual([
            "movable",
            "placeable",
        ]);
    });
});

const EMPTY_SNAPSHOT: BaseSnapshot = {
    at: 0,
    pxPerMM: PX_PER_MM,
    position: {
        sensed: true,
        complete: true,
        held: false,
        contactCount: 3,
        expectedCount: 3,
        centre: { x: 0, y: 0 },
        fittedRadiusPX: 100,
        residualPX: 0,
        confidence: 1,
        shapeConfidence: 1,
    },
    direction: {
        known: true,
        headingDeg: 0,
        unit: { x: 1, y: 0 },
        reference: null,
    },
    move: {
        moving: false,
        from: null,
        to: null,
        deltaFrame: { x: 0, y: 0 },
        deltaTotal: { x: 0, y: 0 },
        distancePX: 0,
        travelledPX: 0,
    },
    rotate: {
        turning: false,
        deltaFrameDeg: 0,
        deltaTotalDeg: 0,
        turns: 0,
        fromHeadingDeg: 0,
    },
    tap: { down: false, dwellMS: 0, movedPX: 0 },
    motionHistory: { points: [] },
    acceleration: {
        velocity: { x: 0, y: 0 },
        speedPXperS: 0,
        acceleration: { x: 0, y: 0 },
        peakSpeed: 0,
    },
};

const snap = (at: number, over: Partial<BaseSnapshot>): BaseSnapshot => ({
    ...EMPTY_SNAPSHOT,
    at,
    ...over,
});

const down = (at: number, dwellMS: number, movedPX = 0): BaseSnapshot =>
    snap(at, { tap: { down: true, dwellMS, movedPX } });

const up = (at: number, dwellMS: number, movedPX = 0): BaseSnapshot =>
    snap(at, { tap: { down: false, dwellMS, movedPX } });

const names = (results: readonly GestureResult[]): readonly string[] =>
    results.map((r) => r.gesture);

describe("GestureRecogniser", () => {
    /* Every recogniser starts believing nothing is on the glass, so
       the first placed frame is a `place`. Consuming it here keeps it
       out of the tests that are about something else. */
    const rec = (): GestureRecogniser => {
        const r = new GestureRecogniser(defaultGestureDefinitions());
        r.update(snap(0, {}), "placed");
        return r;
    };

    const press = (
        recogniser: GestureRecogniser,
        endsAt: number,
        dwellMS: number,
        movedPX = 0,
    ): readonly GestureResult[] => {
        recogniser.update(down(endsAt - dwellMS, dwellMS, movedPX), "placed");
        return recogniser.update(up(endsAt, dwellMS, movedPX), "placed");
    };

    it("calls a short, still press a tap", () => {
        expect(names(press(rec(), 140, 140))).toEqual(["tap"]);
    });

    it("calls a long press a hold", () => {
        expect(names(press(rec(), 820, 820))).toEqual(["hold"]);
    });

    it("is neither when it lands between the two thresholds", () => {
        expect(names(press(rec(), 510, 500))).toEqual([]);
    });

    it("does not call a drag a tap", () => {
        expect(names(press(rec(), 140, 140, 100))).toEqual([]);
    });

    it("sees a second quick press as a double", () => {
        const r = rec();
        press(r, 100, 100);
        expect(names(press(r, 300, 100))).toEqual(["doubleTap"]);
    });

    it("does not double-count a third press", () => {
        /* A double consumes both presses, so three quick ones read as
           double then tap and never as two doubles. */
        const r = rec();
        press(r, 100, 100);
        press(r, 300, 100);
        expect(names(press(r, 500, 100))).toEqual(["tap"]);
    });

    it("takes the first matching definition, so order is precedence", () => {
        /* A second quick press satisfies both `tap` and `doubleTap`.
           Which it is called is decided by the order of the list, and
           that list is data. */
        const both = defaultGestureDefinitions();
        const tapFirst = new GestureRecogniser(
            [...both].sort((a) => (a.gesture === "tap" ? -1 : 1)),
        );
        tapFirst.update(down(0, 0), "placed");
        tapFirst.update(up(100, 100), "placed");
        tapFirst.update(down(200, 0), "placed");
        expect(names(tapFirst.update(up(300, 100), "placed"))).toEqual([
            "tap",
        ]);
    });

    it("recognises a swipe when the movement stops", () => {
        const r = rec();
        r.update(
            snap(0, {
                move: {
                    ...EMPTY_SNAPSHOT.move,
                    moving: true,
                    from: { x: 0, y: 0 },
                    to: { x: 50, y: 0 },
                },
            }),
            "placed",
        );
        const results = r.update(
            snap(300, {
                move: {
                    ...EMPTY_SNAPSHOT.move,
                    moving: false,
                    from: { x: 0, y: 0 },
                    to: { x: 200, y: 0 },
                },
            }),
            "placed",
        );
        expect(names(results)).toEqual(["swipe"]);
        expect(results[0]?.distancePX).toBeCloseTo(200, 6);
        expect(results[0]?.directionDeg).toBeCloseTo(0, 6);
    });

    it("honours a direction range that wraps through zero", () => {
        const north = defaultGestureDefinitions().map((def) =>
            def.gesture === "swipe"
                ? { ...def, directionRangeDeg: [350, 10] as const }
                : def,
        );
        const run = (toY: number): readonly GestureResult[] => {
            const r = new GestureRecogniser(north);
            r.update(
                snap(0, {
                    move: {
                        ...EMPTY_SNAPSHOT.move,
                        moving: true,
                        from: { x: 0, y: 0 },
                        to: { x: 10, y: 0 },
                    },
                }),
                "placed",
            );
            return r.update(
                snap(300, {
                    move: {
                        ...EMPTY_SNAPSHOT.move,
                        moving: false,
                        from: { x: 0, y: 0 },
                        to: { x: 200, y: toY },
                    },
                }),
                "placed",
            );
        };
        expect(names(run(0))).toEqual(["swipe"]);
        expect(names(run(200))).toEqual([]);
    });

    it("does not report the turn it was not there for", () => {
        /* A recogniser built while a puck is already turning — which
           is what happens when a programme finishes loading in the
           middle of a session — measured from zero and announced a
           turn nobody had made. */
        const r = new GestureRecogniser(defaultGestureDefinitions());
        const already = snap(0, {
            rotate: { ...EMPTY_SNAPSHOT.rotate, deltaTotalDeg: 250 },
        });
        expect(names(r.update(already, "placed"))).toEqual([]);
        expect(
            names(
                r.update(
                    snap(16, {
                        rotate: {
                            ...EMPTY_SNAPSHOT.rotate,
                            deltaTotalDeg: 255,
                        },
                    }),
                    "placed",
                ),
            ),
        ).toEqual([]);
    });

    it("reports a turn once per step, measured from the last one", () => {
        const r = rec();
        const turned = (deg: number): BaseSnapshot =>
            snap(100, {
                rotate: { ...EMPTY_SNAPSHOT.rotate, deltaTotalDeg: deg },
            });
        expect(names(r.update(turned(30), "placed"))).toEqual(["rotate"]);
        expect(names(r.update(turned(45), "placed"))).toEqual([]);
        expect(names(r.update(turned(60), "placed"))).toEqual(["rotate"]);
    });

    it("reads a shake, and does not read it as a swipe", () => {
        /* Both cover ground; only one of them arrives somewhere. The
           net displacement is what separates them, and it is why a
           shake definition carries a maximum as well as a minimum. */
        const zigzag = [0, 60, 0, 60, 0, 10].map((x, i) => ({
            x,
            y: 0,
            at: i * 100,
        }));
        const r = rec();
        r.update(
            snap(0, {
                move: {
                    ...EMPTY_SNAPSHOT.move,
                    moving: true,
                    from: { x: 0, y: 0 },
                    to: { x: 0, y: 0 },
                },
            }),
            "placed",
        );
        const results = r.update(
            snap(500, {
                move: {
                    ...EMPTY_SNAPSHOT.move,
                    moving: false,
                    from: { x: 0, y: 0 },
                    to: { x: 10, y: 0 },
                },
                motionHistory: { points: zigzag },
            }),
            "placed",
        );
        expect(names(results)).toEqual(["shake"]);
    });

    it("does not shake again while the same shaking is still in view", () => {
        const zigzag = [0, 60, 0, 60, 0, 10].map((x, i) => ({
            x,
            y: 0,
            at: i * 100,
        }));
        const r = rec();
        const shaking = (at: number): BaseSnapshot =>
            snap(at, { motionHistory: { points: zigzag } });
        expect(names(r.update(shaking(500), "placed"))).toEqual(["shake"]);
        expect(names(r.update(shaking(600), "placed"))).toEqual([]);
    });

    it("ignores jitter too small to be a direction change", () => {
        const jitter = [0, 3, 0, 3, 0, 3].map((x, i) => ({
            x,
            y: 0,
            at: i * 100,
        }));
        const r = rec();
        expect(
            names(
                r.update(
                    snap(500, { motionHistory: { points: jitter } }),
                    "placed",
                ),
            ),
        ).toEqual([]);
    });

    it("recognises placing and removing when a programme asks for them", () => {
        /* Not in the default set: being put down and picked up reaches
           rules as `physical.detected` and `physical.removed`, taken
           from `Presence` itself. A programme that wants a separately
           named gesture for it can still have one, and this is that. */
        const r = new GestureRecogniser([
            { id: "g.place" as GestureId, gesture: "place" },
            { id: "g.remove" as GestureId, gesture: "remove" },
        ]);
        expect(names(r.update(snap(0, {}), "unseen"))).toEqual([]);
        expect(names(r.update(snap(16, {}), "placed"))).toEqual(["place"]);
        expect(names(r.update(snap(32, {}), "placed"))).toEqual([]);
        expect(names(r.update(snap(1000, {}), "lifted"))).toEqual(["remove"]);
    });

    it("leaves placing out of the standard definitions", () => {
        expect(
            defaultGestureDefinitions().map((def) => def.gesture),
        ).not.toContain("place");
    });

    it("gates a press on the feet that were down during it", () => {
        /* Not on the feet down when it is judged. A press is decided
           on the frame the object comes *off* the glass, when the
           count is zero by construction — so asking then meant a
           definition wanting three feet could never match anything at
           all, and the test that was here asserted exactly that
           failure. */
        const pressWith = (
            required: number,
            footDown: number,
        ): readonly string[] => {
            const defs = defaultGestureDefinitions().map((def) =>
                def.gesture === "tap"
                    ? { ...def, requiredContactCount: required }
                    : def,
            );
            const r = new GestureRecogniser(defs);
            r.update(snap(0, {}), "placed");
            r.update(
                {
                    ...down(0, 0),
                    position: {
                        ...EMPTY_SNAPSHOT.position,
                        contactCount: footDown,
                    },
                },
                "placed",
            );
            return names(
                r.update(
                    {
                        ...up(140, 140),
                        position: {
                            ...EMPTY_SNAPSHOT.position,
                            contactCount: 0,
                        },
                    },
                    "placed",
                ),
            );
        };
        expect(pressWith(3, 3)).toEqual(["tap"]);
        expect(pressWith(3, 2)).toEqual([]);
    });

    it("measures the double-tap gap off the glass, not release to release", () => {
        /* The second press's own dwell used to count against the
           window, so two deliberate quarter-second presses a fifth of
           a second apart fell outside a four-hundred-millisecond
           gap. */
        const r = new GestureRecogniser(defaultGestureDefinitions());
        r.update(snap(0, {}), "placed");
        r.update(down(0, 0), "placed");
        r.update(up(250, 250), "placed");
        r.update(down(450, 0), "placed");
        expect(names(r.update(up(700, 250), "placed"))).toEqual(["doubleTap"]);
    });

    it("reports every whole step of a turn, keeping the remainder", () => {
        /* Snapping the baseline to wherever the turn had got to threw
           away everything past the threshold, so a puck turned at
           seven degrees a frame reported ten steps for a full circle
           instead of twelve. */
        const r = rec();
        let steps = 0;
        const turn = (deg: number): void => {
            steps += names(
                r.update(
                    snap(deg, {
                        rotate: {
                            ...EMPTY_SNAPSHOT.rotate,
                            deltaTotalDeg: deg,
                        },
                    }),
                    "placed",
                ),
            ).filter((n) => n === "rotate").length;
        };
        for (let deg = 0; deg < 360; deg += 7) turn(deg);
        turn(360);
        /* One full circle at a step of thirty degrees is twelve
           reports. Snapping the baseline gave ten. */
        expect(steps).toBe(12);
    });
});

const SPEC: FootprintSpec = footprintFrom(
    [0, 120, 240].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return { x: 34 * Math.cos(rad), y: 34 * Math.sin(rad) };
    }),
    80,
    new CircleFitSolver(),
);

describe("signatureFrom", () => {
    it("measures a kind with the solver that will read it", () => {
        /* The expected numbers and the measured ones have to be the
           same quantity. Written by hand they were not, and the
           standard footprint scored zero. */
        const sig = signatureFrom(
            signatureId("s"),
            "ring",
            [0, 120, 240].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                return { x: 34 * Math.cos(rad), y: 34 * Math.sin(rad) };
            }),
            80,
            5,
        );
        expect(sig.geometry).toEqual(SPEC);
    });

    it("refuses a coded signature, which has no recogniser", () => {
        expect(() =>
            signatureFrom(signatureId("s"), "coded", [], 80, 5),
        ).toThrow(/printed patterns/);
    });

    it("takes a slot code only when it is given one", () => {
        const plain = signatureFrom(signatureId("s"), "triad", [], 80, 5);
        const slotted = signatureFrom(signatureId("s"), "slot", [], 80, 5, {
            slots: 12,
            code: 0b101101,
        });
        expect(plain.slotCode).toBeUndefined();
        expect(slotted.slotCode).toEqual({ slots: 12, code: 0b101101 });
    });
});
