import type { PresencePolicy } from "./PresencePolicy";
import type { PresenceState } from "./PresenceState";

/* The state machine that decides whether an object is still here.
 *
 *   unseen ─sensed─> placed ─not sensed, past holdMS─> lifted
 *      ^                ^                                 │
 *      │                └──── sensed ────┤
 *      └──── past memoryMS ──> gone ─────┘
 *
 * Fed one `sensed` boolean per frame and nothing else. It deliberately
 * knows nothing about pucks, contacts or confidence: everything that
 * decides whether the table can see something has already happened in
 * `Position`, and duplicating any of that judgement here would give
 * the table two opinions that can disagree.
 */
export class Presence {
    #state: PresenceState = "unseen";
    #lastSensedAt: number | null = null;
    #sinceAt = 0;

    constructor(private readonly policy: PresencePolicy) {}

    get state(): PresenceState {
        return this.#state;
    }

    /* When the current state began. What a dwell or a "how long has
       this been lying here" question measures from. */
    get sinceAt(): number {
        return this.#sinceAt;
    }

    get lastSensedAt(): number | null {
        return this.#lastSensedAt;
    }

    /* True while the object counts as being on the glass, including
       the hold window where it is simply not being measured. */
    get onTable(): boolean {
        return this.#state === "placed";
    }

    /* True while putting the object back would make it the same
       object again. */
    get recoverable(): boolean {
        return this.#state === "placed" || this.#state === "lifted";
    }

    update(sensed: boolean, at: number): PresenceState {
        /* Gone is terminal. A later sighting must be resolved as a new
           physical rather than silently reviving discarded identity. */
        if (this.#state === "gone") return this.#state;
        if (sensed) {
            this.#lastSensedAt = at;
            this.#enter("placed", at);
            return this.#state;
        }
        if (this.#state === "unseen") return this.#state;
        const last = this.#lastSensedAt ?? at;
        const away = at - last;
        if (away <= this.policy.holdMS) {
            /* Not measured this frame, but not gone either. */
            return this.#state;
        }
        this.#enter(away > this.policy.memoryMS ? "gone" : "lifted", at);
        return this.#state;
    }

    #enter(next: PresenceState, at: number): void {
        if (this.#state === next) return;
        this.#state = next;
        this.#sinceAt = at;
    }

    reset(): void {
        this.#state = "unseen";
        this.#lastSensedAt = null;
        this.#sinceAt = 0;
    }
}
