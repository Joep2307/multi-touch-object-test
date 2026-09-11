import type { AccelerationPolicy } from "../base/acceleration";
import type { DirectionPolicy } from "../base/direction";
import type { MotionHistoryPolicy } from "../base/motion";
import type { MovePolicy } from "../base/move";
import type { PositionPolicy } from "../base/position";
import type { RotatePolicy } from "../base/rotate";
import type { FootprintCompletionPolicy } from "../base";

/* The tuning for every trait, in one bundle.
 *
 * Passed around together because they are set together: they are the
 * table's behaviour, and it should be possible to swap the whole set —
 * for a calmer public setting, or for a test — without threading five
 * arguments through every call.
 *
 * `Tap` is absent because it has nothing to tune. It reports an
 * interval; what counts as a tap is a `GestureDefinition`, which a
 * programme owns rather than the table.
 */
export type BasePolicies = {
    readonly position: PositionPolicy;
    readonly completion: FootprintCompletionPolicy;
    readonly direction: DirectionPolicy;
    readonly move: MovePolicy;
    readonly rotate: RotatePolicy;
    readonly motionHistory: MotionHistoryPolicy;
    readonly acceleration: AccelerationPolicy;
};
