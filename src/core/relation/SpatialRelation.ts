import type { PhysicalId } from "../physical/PhysicalId";
import type { RelationKind } from "./RelationKind";

/* How one object stands to another, this frame.
 *
 * Directed: the relation from A to B is not the relation from B to A.
 * That is not pedantry — `inside` is the obvious case, a small disc
 * within a large one is not the same as the large one within the
 * small — and `relativeDirectionDeg` reverses too. A rule that says
 * "when a token is inside the voting area" needs the direction to
 * mean something.
 *
 * `nearest` is separate from `relation` because it answers a different
 * question. `relation` describes this pair; `nearest` says this pair
 * won out of all the pairs that share a source. A puck can be `far`
 * from everything and still be nearest to one of them.
 */
export type SpatialRelation = {
    readonly sourceId: PhysicalId;
    readonly targetId: PhysicalId;
    readonly distancePX: number;
    readonly relativeDirectionDeg: number;
    readonly relation: RelationKind;
    readonly nearest: boolean;
};
