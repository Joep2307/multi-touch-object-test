import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* How the event's subject stands to its target: near, touching,
   inside.
 *
 * The model's condition list calls this one `region`, and it was two
 * different questions under one name — "is this inside that object"
 * and "is this inside that area". They are separated here:
 * `RegionSubject` answers the second.
 */
export class RelationSubject extends ConditionSubject {
    override readonly id = "relation";

    override resolve(
        _definition: ConditionDefinition,
        subjectId: string | null,
        targetId: string | null,
        context: RuleContext,
    ): unknown {
        if (subjectId === null || targetId === null) return undefined;
        return context.relationBetween(subjectId, targetId) ?? undefined;
    }
}
