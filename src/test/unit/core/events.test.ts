/* The event layer: the hinge the whole model turns on.
 *
 * Above here nothing holds a trait, a contact or a base. If these
 * tests are right, the recognition layer can be replaced, ported to
 * Rust or fed from a recording and nothing above it notices — which is
 * the entire promise of splitting the model in two.
 */
import { describe, expect, it } from "vitest";
import {
    ContactEventPolicy,
    ContactEventSource,
    EventBus,
    PhysicalEventPolicy,
    PhysicalEventSource,
} from "../../../core/events";
import {
    PointerContactSource,
    ReplayContactSource,
} from "../../../core/contact";
import { defaultGestureDefinitions } from "../../../core/gesture";
import type { BaseSnapshot } from "../../../core/base";
import type { ContactRecording } from "../../../core/contact";
import type { EventType, InteractionEvent } from "../../../core/events";
import type {
    KindId,
    PhysicalId,
    PhysicalInstance,
} from "../../../core/physical";
import fixture from "./fixtures/contacts-table-19-18529.json";

const recording = fixture as ContactRecording;

const collect = (bus: EventBus): InteractionEvent[] => {
    const seen: InteractionEvent[] = [];
    bus.subscribe((event) => seen.push(event));
    return seen;
};

const types = (events: readonly InteractionEvent[]): readonly EventType[] =>
    events.map((e) => e.type);

describe("EventBus", () => {
    it("numbers events in the order they were published", () => {
        const bus = new EventBus();
        const a = bus.publish(draft("contact.started", 0));
        const b = bus.publish(draft("contact.ended", 1));
        expect(a.id).not.toBe(b.id);
        expect([a.id, b.id]).toEqual(["event-1", "event-2"]);
    });

    it("queues an event published during delivery rather than nesting", () => {
        /* Effects emit events. One that re-entered the rule engine
           mid-flight would let a rule see a puck in the state it is
           being moved out of, so everything the first event caused has
           to happen before anything the second did. */
        const bus = new EventBus();
        const order: string[] = [];
        let depth = 0;
        let deepest = 0;
        bus.subscribe((event) => {
            depth += 1;
            deepest = Math.max(deepest, depth);
            order.push(event.type);
            if (event.type === "physical.tapped") {
                bus.publish(draft("custom.vote.cast", 1));
            }
            depth -= 1;
        });
        bus.publish(draft("physical.tapped", 0));
        expect(order).toEqual(["physical.tapped", "custom.vote.cast"]);
        expect(deepest).toBe(1);
    });

    it("stops the batch when a listener throws, loudly", () => {
        /* A rules engine that ran half its rules and said nothing
           would leave the table subtly wrong for the rest of the
           afternoon. */
        const bus = new EventBus();
        bus.subscribe(() => {
            throw new Error("rule exploded");
        });
        expect(() => bus.publish(draft("physical.tapped", 0))).toThrow(
            /rule exploded/,
        );
        /* And it recovers: the queue is not left holding the failed
           batch for the next frame to redeliver. */
        const seen = collect(bus);
        bus.subscribe(() => undefined);
        expect(() => bus.publish(draft("contact.ended", 1))).toThrow();
        expect(seen).toHaveLength(0);
    });

    it("lets a subscriber leave", () => {
        const bus = new EventBus();
        const seen: InteractionEvent[] = [];
        const stop = bus.subscribe((e) => seen.push(e));
        bus.publish(draft("contact.started", 0));
        stop();
        bus.publish(draft("contact.ended", 1));
        expect(seen).toHaveLength(1);
    });
});

const draft = (
    type: EventType,
    timestamp: number,
): Parameters<EventBus["publish"]>[0] => ({
    type,
    sourceId: null,
    targetId: null,
    timestamp,
    payload: {},
    properties: {},
});

describe("ContactEventSource", () => {
    const run = (): {
        source: ContactEventSource;
        bus: EventBus;
        seen: InteractionEvent[];
    } => {
        const bus = new EventBus();
        return {
            source: new ContactEventSource(new ContactEventPolicy()),
            bus,
            seen: collect(bus),
        };
    };

    it("says a touch started, moved and ended", () => {
        const { source, bus, seen } = run();
        const glass = new PointerContactSource();
        glass.down(1, 100, 100, 4, 0);
        source.update(glass.frame(0), bus);
        glass.move(1, 140, 100, 4, 16);
        source.update(glass.frame(16), bus);
        glass.up(1);
        source.update(glass.frame(32), bus);
        expect(types(seen)).toEqual([
            "contact.started",
            "contact.moved",
            "contact.ended",
        ]);
    });

    it("says nothing about a touch that has not really moved", () => {
        const { source, bus, seen } = run();
        const glass = new PointerContactSource();
        glass.down(1, 100, 100, 4, 0);
        source.update(glass.frame(0), bus);
        glass.move(1, 101, 100, 4, 16);
        source.update(glass.frame(16), bus);
        expect(types(seen)).toEqual(["contact.started"]);
    });

    it("measures from the last announcement, not the last frame", () => {
        /* A touch creeping a pixel a frame has to report eventually.
           Measuring each step against the previous frame would filter
           the movement away entirely rather than merely delaying it. */
        const { source, bus, seen } = run();
        const glass = new PointerContactSource();
        glass.down(1, 100, 100, 4, 0);
        source.update(glass.frame(0), bus);
        for (let step = 1; step <= 5; step += 1) {
            glass.move(1, 100 + step, 100, 4, step * 16);
            source.update(glass.frame(step * 16), bus);
        }
        expect(types(seen)).toEqual(["contact.started", "contact.moved"]);
    });

    it("produces the same events from the same recording twice", () => {
        /* The property everything above this layer rests on. If a
           replay drifted, every test that replays a session would
           quietly start lying. */
        const play = (): readonly EventType[] => {
            const bus = new EventBus();
            const seen = collect(bus);
            const source = new ContactEventSource(new ContactEventPolicy());
            const replay = new ReplayContactSource(recording);
            for (let at = 0; at < 12000; at += 16) {
                source.update(replay.frame(at), bus);
            }
            return types(seen);
        };
        const first = play();
        expect(first.length).toBeGreaterThan(0);
        expect(play()).toEqual(first);
    });
});

const EMPTY_SNAPSHOT: BaseSnapshot = {
    at: 0,
    pxPerMM: 4,
    position: {
        sensed: true,
        complete: true,
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

const instance = (
    at: number,
    over: Partial<PhysicalInstance> = {},
): PhysicalInstance => ({
    id: "p1" as PhysicalId,
    kindId: "triad-a" as KindId,
    signatureId: null,
    roleId: null,
    pose: {
        position: { x: 400, y: 300 },
        directionDeg: 0,
        directionKnown: true,
        sizePX: 320,
    },
    motion: null,
    currentStateId: null,
    properties: {},
    firstSeenAt: 0,
    lastSeenAt: at,
    status: "detected",
    ...over,
});

describe("PhysicalEventSource", () => {
    const run = (): {
        source: PhysicalEventSource;
        bus: EventBus;
        seen: InteractionEvent[];
    } => {
        const bus = new EventBus();
        return {
            source: new PhysicalEventSource(
                defaultGestureDefinitions(),
                new PhysicalEventPolicy(),
            ),
            bus,
            seen: collect(bus),
        };
    };

    it("announces a puck arriving and leaving, from presence", () => {
        /* From `Presence`, because it is the only thing that knows a
           lifted puck from one that lost a foot for three frames. */
        const { source, bus, seen } = run();
        source.update(instance(0), EMPTY_SNAPSHOT, "placed", 0, bus);
        source.update(instance(16), EMPTY_SNAPSHOT, "placed", 16, bus);
        source.update(instance(900), EMPTY_SNAPSHOT, "lifted", 900, bus);
        expect(types(seen)).toEqual(["physical.detected", "physical.removed"]);
    });

    it("does not announce a removal for a dropped foot", () => {
        const { source, bus, seen } = run();
        source.update(instance(0), EMPTY_SNAPSHOT, "placed", 0, bus);
        source.update(
            instance(16, { status: "missing" }),
            EMPTY_SNAPSHOT,
            "placed",
            16,
            bus,
        );
        expect(types(seen)).toEqual(["physical.detected"]);
    });

    it("rate-limits movement rather than reporting every frame", () => {
        const { source, bus, seen } = run();
        source.update(instance(0), EMPTY_SNAPSHOT, "placed", 0, bus);
        for (let step = 1; step <= 4; step += 1) {
            source.update(
                instance(step * 16, {
                    pose: {
                        position: { x: 400 + step, y: 300 },
                        directionDeg: 0,
                        directionKnown: true,
                        sizePX: 320,
                    },
                }),
                EMPTY_SNAPSHOT,
                "placed",
                step * 16,
                bus,
            );
        }
        expect(types(seen)).toEqual(["physical.detected"]);

        source.update(
            instance(100, {
                pose: {
                    position: { x: 420, y: 300 },
                    directionDeg: 0,
                    directionKnown: true,
                    sizePX: 320,
                },
            }),
            EMPTY_SNAPSHOT,
            "placed",
            16,
            bus,
        );
        expect(types(seen)).toContain("physical.moved");
    });

    it("turns a tap into an event and says which gesture it was", () => {
        const { source, bus, seen } = run();
        const down = {
            ...EMPTY_SNAPSHOT,
            tap: { down: true, dwellMS: 0, movedPX: 0 },
        };
        const up = {
            ...EMPTY_SNAPSHOT,
            at: 140,
            tap: { down: false, dwellMS: 140, movedPX: 0 },
        };
        source.update(instance(0), down, "placed", 0, bus);
        source.update(instance(140), up, "placed", 140, bus);
        const tapped = seen.find((e) => e.type === "physical.tapped");
        expect(tapped?.payload.gesture).toBe("tap");
        expect(tapped?.sourceId).toBe("p1");
    });

    it("forgets an object that has left, so its place does not linger", () => {
        const { source, bus, seen } = run();
        source.update(instance(0), EMPTY_SNAPSHOT, "placed", 0, bus);
        source.forget("p1" as PhysicalId);
        source.update(instance(16), EMPTY_SNAPSHOT, "placed", 16, bus);
        expect(types(seen)).toEqual([
            "physical.detected",
            "physical.detected",
        ]);
    });

    it("works for a physical with no pose at all", () => {
        /* The table itself and the reset button are physicals too, and
           an automatic change has to reach the log the same way a
           human one does. */
        const { source, bus, seen } = run();
        source.update(
            instance(0, { pose: null, motion: null }),
            null,
            "placed",
            0,
            bus,
        );
        expect(types(seen)).toEqual(["physical.detected"]);
    });
});
