import type { ActionId, TransitionId } from "../behaviour";
import type { InteractionEvent } from "../events";
import type { EventLogEntry } from "./EventLogEntry";
import type { ModeId } from "./ModeId";

/* Everything that happened, in order, and never anything else.
 *
 * Append-only, and that is not a style preference. Undo, session
 * replay, the analysis export and any future rule about conflicting
 * changes all fall out of an append-only log, and none of them can be
 * retrofitted afterwards without reopening every function that ever
 * changed anything.
 *
 * There is no `remove` and no `update`. Correcting the record means
 * appending the correction, exactly as it does on paper.
 */
export class EventLog {
    readonly #entries: EventLogEntry[] = [];
    #forgotten = 0;

    /* Bounded, because this runs on a table that is on all afternoon
       and `contact.moved` fires per finger per four pixels. Unbounded
       it is a slow leak that only shows up at the end of the day,
       which is the worst time to find one.
     *
       The oldest entries go first and `forgottenCount` says how many,
       so a session that outgrew its log is visible rather than
       silently shorter than it should be. A session that has to be
       replayed in full writes the log out before it fills. */
    constructor(private readonly maxEntries: number = 20_000) {}

    get forgottenCount(): number {
        return this.#forgotten;
    }

    append(
        event: InteractionEvent,
        modeId: ModeId | null,
        consumedBy: readonly (ActionId | TransitionId)[] = [],
    ): EventLogEntry {
        const entry: EventLogEntry = { event, modeId, consumedBy };
        this.#entries.push(entry);
        while (this.#entries.length > this.maxEntries) {
            this.#entries.shift();
            this.#forgotten += 1;
        }
        return entry;
    }

    get length(): number {
        return this.#entries.length;
    }

    all(): readonly EventLogEntry[] {
        return this.#entries;
    }

    /* Everything between two moments, by the frame clock the events
       were stamped with. Inclusive at both ends, because a session
       boundary is a moment somebody names and excluding it silently
       loses whatever happened exactly then. */
    between(fromAt: number, toAt: number): readonly EventLogEntry[] {
        return this.#entries.filter(
            (entry) =>
                entry.event.timestamp >= fromAt &&
                entry.event.timestamp <= toAt,
        );
    }

    where(
        predicate: (entry: EventLogEntry) => boolean,
    ): readonly EventLogEntry[] {
        return this.#entries.filter(predicate);
    }

    clear(): void {
        this.#entries.length = 0;
        this.#forgotten = 0;
    }
}
