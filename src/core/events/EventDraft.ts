import type { InteractionEvent } from "./InteractionEvent";

/* An event before it has been published.
 *
 * Everything an `InteractionEvent` has except its id, because the id
 * is the publication order and only the bus knows that. Making it a
 * separate type rather than an optional field means nothing can
 * publish an event with an id it made up, and nothing downstream has
 * to wonder whether the id it is looking at is real.
 */
export type EventDraft = Omit<InteractionEvent, "id">;
