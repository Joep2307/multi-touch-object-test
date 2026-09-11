import type { EventDraft } from "../events";

type Pending = {
    readonly name: string;
    readonly dueAt: number;
    readonly sourceId: string | null;
};

/* Deadlines measured against the frame clock.
 *
 * No `setTimeout`, anywhere, ever. A timer on a real clock fires at a
 * different point in a replay than in the session it came from, and
 * the moment that is true the log stops being replayable — which
 * takes undo, the analysis export and the afternoon's vote count with
 * it.
 *
 * Starting a timer that is already running replaces it rather than
 * adding a second. "Close the round in thirty seconds" said twice is
 * one deadline thirty seconds from the second saying, not two rounds
 * closing.
 *
 * A timer belongs to **whoever started it**, and the name alone is not
 * enough to say which. One rule written for every voting token starts
 * a timer called `expire` on each of them; keyed by name alone, the
 * second token to be tapped silently cancelled the first one's
 * deadline, and only one event ever arrived. The session's own timers
 * have no source and key on the name, which is what they want.
 */
export class TimerWheel {
    readonly #pending = new Map<string, Pending>();

    start(name: string, dueAt: number, sourceId: string | null = null): void {
        this.#pending.set(keyOf(name, sourceId), { name, dueAt, sourceId });
    }

    cancel(name: string, sourceId: string | null = null): void {
        this.#pending.delete(keyOf(name, sourceId));
    }

    get pendingCount(): number {
        return this.#pending.size;
    }

    /* Everything due at or before `at`, as events ready to publish,
       oldest deadline first. Ordering matters: two timers due in the
       same frame should fire in the order they were meant to, not in
       the order they happen to be stored. */
    due(at: number): readonly EventDraft[] {
        const ready = [...this.#pending.values()]
            .filter((timer) => timer.dueAt <= at)
            .sort((a, b) => a.dueAt - b.dueAt);
        for (const timer of ready) {
            this.#pending.delete(keyOf(timer.name, timer.sourceId));
        }
        return ready.map((timer) => ({
            type: `custom.timer.${timer.name}` as const,
            sourceId: timer.sourceId,
            targetId: null,
            /* The deadline, not the frame it was noticed in. A frame
               that ran late must not move the recorded moment, or a
               replay would drift a little further every time. */
            timestamp: timer.dueAt,
            payload: { name: timer.name },
            properties: {},
        }));
    }

    clear(): void {
        this.#pending.clear();
    }
}

/* A timer is identified by its name *and* its owner. */
function keyOf(name: string, sourceId: string | null): string {
    return sourceId === null ? name : `${sourceId}\u0000${name}`;
}
