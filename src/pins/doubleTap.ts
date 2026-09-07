import { touches } from "../state/touches";

/* Two taps in quick succession on the same marker. After a double tap, the
   count restarts, so three taps don't count as two double taps. */
export function doubleTap(id: string): boolean {
    const now = performance.now();
    const dbl = id === touches.lastTapId && now - touches.lastTapT < 430;
    touches.lastTapId = dbl ? null : id;
    touches.lastTapT = now;
    return dbl;
}
