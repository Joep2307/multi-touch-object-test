import type { AccelerationPolicy } from "../base/acceleration";
import type { DirectionPolicy } from "../base/direction/DirectionPolicy";
import type { MovePolicy } from "../base/move/MovePolicy";
import type { PositionPolicy } from "../base/position/PositionPolicy";
import type { RotatePolicy } from "../base/rotate/RotatePolicy";
import type { TailPolicy } from "../base/tail";
import type { TapPolicy } from "../base/tap/TapPolicy";

/* The tuning for every trait, in one bundle.
 *
 * Passed around together because they are set together: they are the
 * table's behaviour, and it should be possible to swap the whole set —
 * for a calmer public setting, or for a test — without threading five
 * arguments through every call.
 */
export type BasePolicies = {
    readonly position: PositionPolicy;
    readonly direction: DirectionPolicy;
    readonly move: MovePolicy;
    readonly rotate: RotatePolicy;
    readonly tap: TapPolicy;
    readonly tail: TailPolicy;
    readonly acceleration: AccelerationPolicy;
};
