import { CFG } from "../../config";
import type { Track } from "../../types";

export function puckTapGlow(t: Track, now: number): number {
    if (!t.tapT0) return 0;
    return Math.max(0, 1 - (now - t.tapT0) / CFG.puckTapMS);
}
