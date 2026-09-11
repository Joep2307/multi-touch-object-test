import { GestureRecogniser } from "../gesture/GestureRecogniser";
import type { BaseSnapshot } from "../base/BaseSnapshot";
import type { EventBus } from "./EventBus";
import type { EventDraft } from "./EventDraft";
import type { EventType } from "./EventType";
import type { GestureDefinition } from "../gesture/GestureDefinition";
import type { GestureResult } from "../gesture/GestureResult";
import type { PhysicalEventPolicy } from "./PhysicalEventPolicy";
import type { PhysicalId } from "../physical/PhysicalId";
import type { PhysicalInstance } from "../physical/PhysicalInstance";
import type { PresenceState } from "../physical/PresenceState";
import type { Vec2 } from "../base/Vec2";

const NO_PROPERTIES = Object.freeze({});

type Watched = {
    readonly gestures: GestureRecogniser;
    announced: Vec2 | null;
    placed: boolean;
};

/* Turns what an object did into events.
 *
 * Two sources feed it and they do not overlap. Being put down and
 * picked up comes from `Presence`, because that is the only thing that
 * knows the difference between a lifted puck and one that lost a foot
 * for three frames. Everything a person did to the object — tapped it,
 * turned it, swiped it, shook it — comes from the gesture recogniser,
 * so the thresholds are a programme's to change.
 *
 * Continuous movement is the exception with no gesture behind it, and
 * it is rate-limited here: sixty `physical.moved` events a second is
 * the wrong granularity for a rule to reason about.
 *
 * **The recognisers live here rather than on the physical.** A gesture
 * definition belongs to a programme, and a programme can be reloaded
 * while pucks are lying on the glass. Hanging the recogniser off the
 * object would mean rebuilding every object to change a threshold; the
 * plan's first guess was the other way round, and this is why it
 * changed.
 *
 * Everything is stamped with the **frame's** clock, not with when the
 * object was last measured. A puck that has been lifted was last seen
 * a hold-window ago, so stamping `physical.removed` with that put the
 * event before the contact and region events of the very same frame —
 * and an append-only log whose timestamps go backwards is one that
 * cannot be replayed.
 *
 * The `place` and `remove` gestures are deliberately **not** mapped.
 * They describe the same fact as the presence transition above, and a
 * programme that deleted them from its definitions would stop hearing
 * that a puck had been put on the table — which is not a programme's
 * decision to make. They stay in the vocabulary for a programme that
 * wants a separately named gesture for it.
 */
export class PhysicalEventSource {
    readonly #watched = new Map<PhysicalId, Watched>();

    constructor(
        private readonly definitions: readonly GestureDefinition[],
        private readonly policy: PhysicalEventPolicy,
    ) {}

    update(
        instance: PhysicalInstance,
        snapshot: BaseSnapshot | null,
        presence: PresenceState,
        at: number,
        bus: EventBus,
    ): void {
        const watched = this.#watch(instance.id);

        const placed = presence === "placed";
        if (placed !== watched.placed) {
            watched.placed = placed;
            if (!placed) watched.announced = null;
            bus.publish(
                this.#draft(
                    placed ? "physical.detected" : "physical.removed",
                    instance,
                    at,
                    {},
                ),
            );
        }

        if (snapshot === null) return;

        const position = instance.pose?.position ?? null;
        if (position !== null) {
            const minMovePX = this.policy.minMoveMM * snapshot.pxPerMM;
            const was = watched.announced;
            if (was === null) {
                watched.announced = position;
            } else if (
                Math.hypot(position.x - was.x, position.y - was.y) >= minMovePX
            ) {
                watched.announced = position;
                bus.publish(
                    this.#draft("physical.moved", instance, at, {
                        x: position.x,
                        y: position.y,
                        fromX: was.x,
                        fromY: was.y,
                    }),
                );
            }
        }

        for (const result of watched.gestures.update(snapshot, presence)) {
            const type = eventTypeOf(result);
            if (type === null) continue;
            bus.publish(
                this.#draft(type, instance, result.at, {
                    gesture: result.gesture,
                    definitionId: result.definitionId,
                    durationMS: result.durationMS,
                    distancePX: result.distancePX,
                    directionDeg: result.directionDeg,
                }),
            );
        }
    }

    #watch(id: PhysicalId): Watched {
        const known = this.#watched.get(id);
        if (known !== undefined) return known;
        const fresh: Watched = {
            gestures: new GestureRecogniser(this.definitions),
            announced: null,
            placed: false,
        };
        this.#watched.set(id, fresh);
        return fresh;
    }

    /* Called when a physical leaves for good. Without it the map would
       grow for as long as the table runs, and a returning object would
       inherit a stranger's idea of where it last was. */
    forget(id: PhysicalId): void {
        this.#watched.delete(id);
    }

    #draft(
        type: EventType,
        instance: PhysicalInstance,
        at: number,
        payload: Readonly<Record<string, unknown>>,
    ): EventDraft {
        return {
            type,
            sourceId: instance.id,
            targetId: null,
            timestamp: at,
            payload: { kindId: instance.kindId, ...payload },
            properties: instance.properties ?? NO_PROPERTIES,
        };
    }

    reset(): void {
        this.#watched.clear();
    }
}

/* One gesture, one event. A gesture with no event type here is one the
   table recognises but does not announce; see the note about `place`
   and `remove` above. */
function eventTypeOf(result: GestureResult): EventType | null {
    switch (result.gesture) {
        case "tap":
        case "doubleTap":
        case "hold":
            return "physical.tapped";
        case "swipe":
            return "physical.swiped";
        case "shake":
            return "physical.shaken";
        case "rotate":
            return "physical.rotated";
        case "place":
        case "remove":
            return null;
    }
}
