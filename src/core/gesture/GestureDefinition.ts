import type { GestureId } from "./GestureId";

/* What a gesture is, in numbers a programme owns.
 *
 * This is where the thresholds went when they left `TapPolicy`. Three
 * hundred milliseconds is a tap at a fast-moving game table and much
 * too quick for a museum piece someone is being careful with, so it is
 * data rather than tuning: a programme file changes it, and no code
 * moves.
 *
 * A union rather than one type with a dozen optional fields, because
 * the fields genuinely do not overlap — a swipe has a direction and a
 * hold does not, and a definition that carried both would be a
 * question nobody can answer. This way a rotate definition cannot be
 * written with a tap's timings, and the recogniser cannot forget to
 * check one.
 *
 * The model draws a single entity with a flat field list. Two of the
 * fields below are not on that drawing: a shake needs to count
 * reversals and a rotate needs an angle, and neither can be expressed
 * as a duration or a distance. `inputEventTypes` from the drawing
 * arrives in phase B, with the event types it names.
 */
type Common = {
    readonly id: GestureId;
    /* Only recognise this while exactly this many feet are down.
       Absent means any number, which is what every kind on this table
       wants — a puck holding on through a dropout is still being
       tapped. */
    readonly requiredContactCount?: number;
};

export type GestureDefinition = Common &
    (
        | {
              readonly gesture: "tap";
              readonly maxDurationMS: number;
              readonly maxDistancePX: number;
          }
        | {
              readonly gesture: "doubleTap";
              readonly maxDurationMS: number;
              readonly maxDistancePX: number;
              /* How long after the previous tap ended a second one
                 still counts as part of the same double. */
              readonly maxGapMS: number;
          }
        | {
              readonly gesture: "hold";
              readonly minDurationMS: number;
              readonly maxDistancePX: number;
          }
        | {
              readonly gesture: "swipe";
              readonly minDistancePX: number;
              readonly maxDurationMS: number;
              /* Degrees, from and to, clockwise on the screen's angle
                 convention. Null accepts any direction, which is what
                 a swipe means when nothing is being swiped *towards*
                 anything. A range may wrap through zero. */
              readonly directionRangeDeg: readonly [number, number] | null;
          }
        | {
              readonly gesture: "rotate";
              /* Fires once per this many degrees turned, so holding a
                 dial round reports repeatedly rather than once. */
              readonly minRotationDeg: number;
          }
        | {
              readonly gesture: "shake";
              readonly minReversals: number;
              readonly withinMS: number;
              /* A shake goes nowhere. Past this much net movement it
                 was a wiggle on the way somewhere, which is what
                 keeps a shake and a swipe apart. */
              readonly maxNetDistancePX: number;
              readonly minTravelPX: number;
              /* Movement smaller than this is not a direction change,
                 it is the sensor. */
              readonly minStepPX: number;
          }
        | { readonly gesture: "place" }
        | { readonly gesture: "remove" }
    );
