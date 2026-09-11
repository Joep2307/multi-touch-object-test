import { MIN_MATCHED_POINTS } from "./constants";
import { Policy } from "./Policy";

/* When two feet are enough to say where the third one is.
 *
 * `minMatchedFeet` is two because two matched points fix a rigid motion
 * in the plane completely. It is a policy rather than a constant so a
 * kind read on five feet could ask for three before it trusts a
 * reconstruction; the maths does not need it, and a noisy table might.
 *
 * `rigidTolerance` is what stops a finger landing where a foot was from
 * being read as that foot. The matched feet must still be this far, as
 * a fraction, from the distance they were apart on the reference frame.
 * Measurement noise on the real pucks is 1.6%, so five per cent is
 * about three times the noise — loose enough never to refuse a real
 * puck, tight enough that a finger anywhere but the exact spot is
 * refused. Tuned against the table recordings.
 *
 * `maxGapMS` is the same reasoning as `RotatePolicy.maxGapMS`, and the
 * same number: four frames at sixty hertz. A reference older than that
 * is not worth matching against — a puck lifted and put back has not
 * moved rigidly in between, however much its feet appear to have — and
 * if the touch driver ever reuses a contact id, matching across the gap
 * would credit the object with a motion nobody made.
 */
export class FootprintCompletionPolicy extends Policy {
    override readonly id = "footprintCompletion";

    constructor(
        readonly minMatchedFeet: number = MIN_MATCHED_POINTS,
        readonly rigidTolerance: number = 0.05,
        readonly maxGapMS: number = 70,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            minMatchedFeet: this.minMatchedFeet,
            rigidTolerance: this.rigidTolerance,
            maxGapMS: this.maxGapMS,
        };
    }
}
