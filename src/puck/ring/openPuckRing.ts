import type { Track } from "../../types/Track";

export function openPuckRing(t: Track): void {
    t.ring = true;
}
