import { MIN_MATCHED_POINTS } from "./constants";
import { Policy } from "./Policy";

/* When two feet are enough to say where the third one is.
 *
 * `minMatchedFeet` is two because two matched points fix a rigid motion
 * in the plane completely. It is a policy rather than a constant so a
 * kind read on five feet could ask for three before it trusts a
 * reconstruction; the maths does not need it, and a noisy table might.
 *
 * `rigidTolerance` is how far the matched feet may drift, as a
 * fraction, from the distance they were apart on the reference frame.
 * **0.15, measured**, and the measurement was a surprise: when a foot
 * lifts, the two contacts that remain do not stay where they were. On
 * `contacts-table-122` a pair 133.3 px apart with three feet down
 * reports 119 to 127 px for as long as only two are — a lasting shrink
 * of about ten per cent, because tilting the puck moves the blobs the
 * driver reports, not the feet. At five per cent that recording held on
 * 14 of its 82 two-foot frames; at fifteen it holds all 82, and the
 * centre it hands back when the third foot returns is *closer* (4.8 px
 * against 12.8), because holding right up to the moment of return
 * tracks the puck instead of extrapolating from a stale start.
 *
 * It is worth being clear about what this does and does not guard. It
 * is **not** what refuses a finger landing where a foot was: such a
 * finger is a new touch with a new contact id and is not one of the
 * watched feet at all. This is the sanity check behind that — it
 * catches contacts that have stopped behaving like one rigid body, and
 * it can afford to be generous because the identity check in front of
 * it is exact.
 */
export class FootprintCompletionPolicy extends Policy {
    override readonly id = "footprintCompletion";

    constructor(
        readonly minMatchedFeet: number = MIN_MATCHED_POINTS,
        readonly rigidTolerance: number = 0.15,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            minMatchedFeet: this.minMatchedFeet,
            rigidTolerance: this.rigidTolerance,
        };
    }
}
