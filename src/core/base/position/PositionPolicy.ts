import { Policy } from "../Policy";

/* How forgiving `Position` is about what counts as an object.
 *
 * Every number the trait uses lives here. The defaults are the
 * existing table's behaviour translated: `minFeet` 3 because that is
 * the new standard footprint, `sizeTolerance` 0.22 from
 * `CFG.ringSizeTol`, and `maxResidualPX` set so a foot trembling the
 * two millimetres a real table produces still reads as the same
 * object.
 *
 * These are starting values, not measurements. They get tuned against
 * recorded fixtures in phase 6, which is the first time there is
 * anything real to tune them against.
 */
export class PositionPolicy extends Policy {
    override readonly id = "position";

    constructor(
        readonly minFeet: number = 3,
        readonly sizeTolerance: number = 0.22,
        readonly maxResidualPX: number = 12,
    ) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            minFeet: this.minFeet,
            sizeTolerance: this.sizeTolerance,
            maxResidualPX: this.maxResidualPX,
        };
    }
}
