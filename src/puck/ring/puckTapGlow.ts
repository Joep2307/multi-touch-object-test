import { CFG } from "../../config/CFG";
import type { Track } from "../../types/Track";

export function puckTapGlow(t: Track, now: number): number {
    if (!t.tapT0) return 0;
    return Math.max(0, 1 - (now - t.tapT0) / CFG.puckTapMS);
}
