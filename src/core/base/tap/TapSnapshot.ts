import type { TapKind } from "./TapKind";

/* How long the object has been on the glass, and what that came to.
 *
 * `dwellMS` is the live interval — the thing you asked for — and it
 * is available every frame while the object is down, not only at the
 * end. That is what lets a ring menu fill up as you hold, instead of
 * only reacting once you let go.
 *
 * `kind` is the verdict on the *last completed* episode, so it
 * appears on the frame the object leaves the glass and stays until
 * the next one begins. `movedPX` is how far the centre wandered
 * during it, which is what separates a tap from a short drag.
 */
export type TapSnapshot = {
    readonly down: boolean;
    readonly dwellMS: number;
    readonly movedPX: number;
    readonly kind: TapKind;
};
