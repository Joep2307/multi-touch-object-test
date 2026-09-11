import type { AccelerationSnapshot } from "./acceleration";
import type { DirectionSnapshot } from "./direction";
import type { MotionHistorySnapshot } from "./motion";
import type { MoveSnapshot } from "./move";
import type { PositionSnapshot } from "./position";
import type { RotateSnapshot } from "./rotate";
import type { TapSnapshot } from "./tap";

/* Everything the base knows about one object at one moment.
 *
 * One immutable object per frame, so a renderer, the journal and a
 * test can all read the same frame and be certain they are looking at
 * the same instant. Half-updated state read a frame late is the class
 * of bug that makes a table flicker, and it is unfindable.
 *
 * `pxPerMM` rides along because it is what turns any of these numbers
 * into millimetres, and because it is no longer a constant: the table
 * refines it while it runs, so a snapshot without it cannot be
 * interpreted later.
 */
export type BaseSnapshot = {
    readonly at: number;
    readonly pxPerMM: number;
    readonly position: PositionSnapshot;
    readonly direction: DirectionSnapshot;
    readonly move: MoveSnapshot;
    readonly rotate: RotateSnapshot;
    readonly tap: TapSnapshot;
    readonly motionHistory: MotionHistorySnapshot;
    readonly acceleration: AccelerationSnapshot;
};
