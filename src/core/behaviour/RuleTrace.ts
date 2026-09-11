import type { RuleTraceEntry } from "./RuleTraceEntry";

/* A bounded record of the recent past.
 *
 * Bounded because it is a debugging aid running on a table that stays
 * on all afternoon, and an unbounded one would be a slow leak that
 * only shows up at the end of the day. What outlives the window
 * belongs in the event log, which is append-only on purpose.
 */
export class RuleTrace {
    readonly #entries: RuleTraceEntry[] = [];

    constructor(private readonly maxEntries: number = 200) {}

    add(entry: RuleTraceEntry): void {
        this.#entries.push(entry);
        if (this.#entries.length > this.maxEntries) this.#entries.shift();
    }

    all(): readonly RuleTraceEntry[] {
        return this.#entries;
    }

    /* Why nothing happened when this rule was expected to fire. */
    lastRefusal(ruleId: string): RuleTraceEntry | null {
        for (let i = this.#entries.length - 1; i >= 0; i -= 1) {
            const entry = this.#entries[i];
            if (entry === undefined) continue;
            if (entry.ruleId === ruleId && entry.outcome !== "fired") {
                return entry;
            }
        }
        return null;
    }

    clear(): void {
        this.#entries.length = 0;
    }
}
