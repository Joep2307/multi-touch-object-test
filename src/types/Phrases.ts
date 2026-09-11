import type { Phrase } from "./Phrase";

/* One language from the language table. `topics` is the only list. */
export interface Phrases {
    topics: string[];
    [key: string]: Phrase | string[];
}
