import type { EventDraft } from "./EventDraft";
import type { EventId } from "./EventId";
import type { InteractionEvent } from "./InteractionEvent";

type Listener = (event: InteractionEvent) => void;

/* Where events go, in the order they happened.
 *
 * Synchronous and single-threaded, because a table has one frame and
 * one truth in it. An asynchronous bus would let a rule fire on a
 * puck's position from two frames ago, which is exactly the class of
 * bug that is impossible to find by looking.
 *
 * **An event published while another is being delivered is queued
 * behind it, never nested.** That is the one decision in this file.
 * Effects emit events, and an effect that emitted while its own action
 * was mid-flight would re-enter the rule engine with a half-applied
 * state — a rule seeing a puck in the state it is being moved out of.
 * Queueing makes the order the obvious one: everything the first event
 * caused happens before anything the second did.
 *
 * A listener that throws takes the rest of the batch with it, and the
 * error is not swallowed. A rules engine that ran half its rules and
 * said nothing is worse to debug than one that stopped: the table
 * would keep running, subtly wrong, for the rest of the afternoon.
 */
export class EventBus {
    readonly #listeners = new Set<Listener>();
    readonly #queue: InteractionEvent[] = [];
    #dispatching = false;
    #nextId = 0;

    publish(draft: EventDraft): InteractionEvent {
        this.#nextId += 1;
        const event: InteractionEvent = {
            ...draft,
            id: `event-${String(this.#nextId)}` as EventId,
        };
        this.#queue.push(event);
        if (!this.#dispatching) this.#drain();
        return event;
    }

    #drain(): void {
        this.#dispatching = true;
        try {
            /* An index rather than `shift`, so a listener publishing
               during delivery appends to the same pass instead of
               reallocating the queue under it. */
            for (let i = 0; i < this.#queue.length; i += 1) {
                const event = this.#queue[i];
                if (event === undefined) continue;
                for (const listener of this.#listeners) listener(event);
            }
        } finally {
            this.#queue.length = 0;
            this.#dispatching = false;
        }
    }

    subscribe(listener: Listener): () => void {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }

    clear(): void {
        this.#listeners.clear();
        this.#queue.length = 0;
        this.#dispatching = false;
    }
}
