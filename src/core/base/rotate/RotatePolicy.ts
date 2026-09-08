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
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            deadZoneDeg: this.deadZoneDeg,
            maxStepDeg: this.maxStepDeg,
        };
    }
}
