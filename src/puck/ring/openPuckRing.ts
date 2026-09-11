import type { Track } from "../../types";

export function openPuckRing(t: Track): void {
    t.ring = true;
}
