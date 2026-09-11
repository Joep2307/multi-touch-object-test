import { Policy } from "../Policy";

/* When a change of heading is a turn, and when it is a misreading.
 *
 * `maxStepDeg` is the one that matters. A heading source can pick a
 * different foot as the nose from one frame to the next — that is
 * what `minApexAsymmetry` guards against, but it cannot catch every
 * case — and the result is an instant jump of a hundred-odd degrees.
 * A physical object cannot turn that fast between two frames at
 * 60 fps, so a step that large is a measurement error, not a turn,
 * and it is dropped rather than accumulated. Without this guard one
 * bad frame permanently offsets `deltaTotalDeg`.
 *
 * `maxRejectedFrames` is what stops that guard from becoming a trap.
 * Rejecting a step keeps the baseline where it was, which is right for
 * a single bad frame — but a heading that has *genuinely* moved stays
 * rejected forever, and rotation dies silently. Pick a puck up, turn
 * it in your hand, put it back: the heading is legitimately somewhere
 * else, every frame after that is a large step, and without this the
 * puck never turns again. After this many rejections in a row the
 * baseline moves to wherever the heading now is, without the jump
 * being counted as a turn.
 *
 * There is deliberately no amplification here. The old table
 * multiplies rotation to drive the zoom, but that is the zoom's
 * opinion about what turning means, not a property of the turn.
 * It belongs to `ZoomInteraction` in phase 8; a trait reports
 * degrees.
 */
export class RotatePolicy extends Policy {
    override readonly id = "rotate";

    constructor(
        readonly deadZoneDeg: number = 0.4,
        readonly maxStepDeg: number = 45,
        readonly maxRejectedFrames: number = 5,
        /* How long a gap may be before the previous frame's feet are
           no longer worth matching against. Four frames at sixty
           hertz. A puck lifted and put back has not turned in the
           meantime, however far its feet appear to have moved — and
           if the touch driver ever hands the new feet the same contact
           ids as the old ones, matching across the gap would credit
           the object with a rotation nobody made. */
        readonly maxGapMS: number = 70,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            deadZoneDeg: this.deadZoneDeg,
            maxStepDeg: this.maxStepDeg,
            maxRejectedFrames: this.maxRejectedFrames,
            maxGapMS: this.maxGapMS,
        };
    }
}
