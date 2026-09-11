import type { ExtensionProperties } from "../programme";
import type { EventId } from "./EventId";
import type { EventPayload } from "./EventPayload";
import type { EventType } from "./EventType";

/* Something that happened, as a fact rather than as a call.
 *
 * The hinge of the whole model. Below this, the table measures; above
 * it, rules read. Nothing above the event layer holds a `Base`, a
 * trait or a contact — which is what lets the recognition layer be
 * replaced, ported to Rust, or fed from a recording, with nothing
 * above it noticing.
 *
 * `timestamp` comes from the frame clock and never from a wall clock.
 * That single rule is what makes a replay produce the same events at
 * the same moments as the session it came from, and therefore what
 * makes the log worth keeping.
 *
 * `sourceId` is who did it and `targetId` is what to, both optional
 * because not every event has both: a contact starting has no target,
 * and a mode changing has neither. They are plain strings rather than
 * a `PhysicalId`, because a source may also be a region, a mode or a
 * state — the log has to be able to say what happened without every
 * subject being an object on the glass.
 */
export type InteractionEvent = {
    readonly id: EventId;
    readonly type: EventType;
    readonly sourceId: string | null;
    readonly targetId: string | null;
    readonly timestamp: number;
    readonly payload: EventPayload;
    readonly properties: ExtensionProperties;
};
