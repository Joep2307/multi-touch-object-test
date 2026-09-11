import type { Gesture } from "./Gesture";
import type { GestureId } from "./GestureId";

/* One gesture, recognised.
 *
 * Carries the definition that matched as well as the gesture it
 * recognised, so a rule can trigger on either — on taps in general, or
 * on the particular slow tap a careful programme defined.
 *
 * `at` comes from the frame clock and never from a wall clock. That is
 * what makes a replayed recording produce the same gestures at the
 * same moments as the session it came from, which every test above
 * this layer depends on.
 */
export type GestureResult = {
    readonly definitionId: GestureId;
    readonly gesture: Gesture;
    readonly at: number;
    /* How long the movement took. Zero for `place` and `remove`,
       which are instants rather than intervals. */
    readonly durationMS: number;
    /* How far the object went, in pixels: net for a swipe, wandered
       for a press, path length for a shake. */
    readonly distancePX: number;
    /* Which way, for the gestures that have a direction. Null for the
       ones that do not. */
    readonly directionDeg: number | null;
};
