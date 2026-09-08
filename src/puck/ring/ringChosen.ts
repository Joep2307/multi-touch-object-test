import type { Track } from "../../types/Track";

/* The selected topic is the only persistent choice on the ring. */
export function ringChosen(t: Track): number {
    return t.topicIdx;
}
