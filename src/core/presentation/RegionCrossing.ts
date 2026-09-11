import type { PhysicalId } from "../physical";
import type { RegionId } from "./RegionId";

/* An object arriving in, or leaving, a piece of table that means
   something.
 *
 * `accepted` is the field worth having. A region does not keep
 * anything out — a table cannot stop a block being put down in the
 * wrong place — so the crossing is reported either way, marked. A rule
 * can then say something about the wrong object in the voting area
 * instead of the wrong object silently doing nothing.
 */
export type RegionCrossing = {
    readonly physicalId: PhysicalId;
    readonly regionId: RegionId;
    readonly accepted: boolean;
};
