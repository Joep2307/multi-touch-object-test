import { Policy } from "../base";
import { FAR_MM, NEAR_MM, TOUCH_TOLERANCE_MM } from "./constants";

/* What counts as near, and what counts as having stopped being near.
 *
 * Two distances rather than one, because a single threshold has no
 * stable answer at exactly the threshold. Two pucks left sitting on it
 * would cross it on sensor noise alone, and any rule watching for the
 * crossing would fire for as long as they lay there. Entering takes
 * `nearMM`; leaving takes `farMM`, which is larger.
 *
 * Distances are in millimetres, not pixels. What "next to each other"
 * means is a fact about the table and the hands using it; how many
 * pixels that is depends on a screen the model refuses to assume
 * anything about.
 */
export class SpatialRelationPolicy extends Policy {
    override readonly id = "spatialRelation";

    constructor(
        readonly nearMM: number = NEAR_MM,
        readonly farMM: number = FAR_MM,
        readonly touchToleranceMM: number = TOUCH_TOLERANCE_MM,
    ) {
        super();
        if (farMM < nearMM) {
            throw new Error(
                `A relation policy needs farMM (${String(farMM)}) to be ` +
                    `at least nearMM (${String(nearMM)}); otherwise ` +
                    `leaving is easier than arriving and the pair ` +
                    `flickers.`,
            );
        }
    }

    override describe(): Readonly<Record<string, number>> {
        return {
            nearMM: this.nearMM,
            farMM: this.farMM,
            touchToleranceMM: this.touchToleranceMM,
        };
    }
}
