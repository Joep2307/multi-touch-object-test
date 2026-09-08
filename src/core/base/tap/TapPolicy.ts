import { Policy } from "../Policy";

/* The thresholds that turn an interval into a verdict.
 *
 * `moveMaxPX` is what stops a drag being reported as a tap. Without
 * it, picking a puck up and putting it down somewhere else registers
 * as a tap on arrival, which on this table would place a marker
 * nobody asked for.
 */
export class TapPolicy extends Policy {
    override readonly id = "tap";

    constructor(
        readonly tapMaxMS: number = 300,
        readonly doubleGapMS: number = 400,
        readonly holdMinMS: number = 700,
        readonly moveMaxPX: number = 18,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            tapMaxMS: this.tapMaxMS,
            doubleGapMS: this.doubleGapMS,
            holdMinMS: this.holdMinMS,
            moveMaxPX: this.moveMaxPX,
        };
    }
}
