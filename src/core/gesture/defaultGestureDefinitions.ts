import {
    DOUBLE_TAP_GAP_MS,
    HOLD_MIN_MS,
    PRESS_MAX_MOVE_PX,
    ROTATE_STEP_DEG,
    SHAKE_MAX_NET_PX,
    SHAKE_MIN_STEP_PX,
    SHAKE_MIN_TRAVEL_PX,
    SHAKE_REVERSALS,
    SHAKE_WINDOW_MS,
    SWIPE_MAX_MS,
    SWIPE_MIN_PX,
    TAP_MAX_MS,
} from "./constants";
import type { GestureDefinition } from "./GestureDefinition";
import type { GestureId } from "./GestureId";

const id = (name: string): GestureId => name as GestureId;

/* The eight gestures the table understands out of the box.
 *
 * Data, not behaviour: this is what a programme file will contain once
 * phase F can load one, and it is here in code meanwhile so that
 * nothing has to be written twice when it moves. A programme that
 * wants different numbers replaces the list; nothing recompiles.
 *
 * **Order matters.** The recogniser takes the first press gesture that
 * matches, so `doubleTap` comes before `tap`: a second quick press
 * satisfies both, and whichever is listed first is what it is called.
 *
 * `place` and `remove` are deliberately absent, though the recogniser
 * implements both. Being put down and picked up reaches rules as
 * `physical.detected` and `physical.removed`, taken straight from
 * `Presence` — which is the only thing that knows a lifted puck from
 * one that lost a foot for three frames. Defining them here as well
 * would give the table two ways of saying the same thing, and a
 * programme that deleted one of them would stop hearing that a puck
 * had been put on the glass. A programme that wants a separately named
 * gesture for it can still add one.
 */
export function defaultGestureDefinitions(): readonly GestureDefinition[] {
    return [
        {
            id: id("gesture.doubleTap"),
            gesture: "doubleTap",
            maxDurationMS: TAP_MAX_MS,
            maxDistancePX: PRESS_MAX_MOVE_PX,
            maxGapMS: DOUBLE_TAP_GAP_MS,
        },
        {
            id: id("gesture.tap"),
            gesture: "tap",
            maxDurationMS: TAP_MAX_MS,
            maxDistancePX: PRESS_MAX_MOVE_PX,
        },
        {
            id: id("gesture.hold"),
            gesture: "hold",
            minDurationMS: HOLD_MIN_MS,
            maxDistancePX: PRESS_MAX_MOVE_PX,
        },
        {
            id: id("gesture.swipe"),
            gesture: "swipe",
            minDistancePX: SWIPE_MIN_PX,
            maxDurationMS: SWIPE_MAX_MS,
            directionRangeDeg: null,
        },
        {
            id: id("gesture.rotate"),
            gesture: "rotate",
            minRotationDeg: ROTATE_STEP_DEG,
        },
        {
            id: id("gesture.shake"),
            gesture: "shake",
            minReversals: SHAKE_REVERSALS,
            withinMS: SHAKE_WINDOW_MS,
            maxNetDistancePX: SHAKE_MAX_NET_PX,
            minTravelPX: SHAKE_MIN_TRAVEL_PX,
            minStepPX: SHAKE_MIN_STEP_PX,
        },
    ];
}
