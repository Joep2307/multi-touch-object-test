import { commitPuckChoice } from "./commitPuckChoice";
import { puckMenuHit } from "./puckMenuHit";

export function tryPuckMenuTap(x: number, y: number): boolean {
    const hit = puckMenuHit(x, y);
    if (!hit) return false;
    if (hit.item.disabled) return true;
    hit.track.tapIdx = hit.idx;
    hit.track.tapT0 = performance.now();
    commitPuckChoice(hit.track, hit.idx);
    return true;
}
