import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* Which areas of the table this object is standing in.
 *
 * Resolves to a list, so the useful operator is `has`: *the regions
 * this token is in include the voting area*. An object can be in
 * several at once — a voting area inside a player area — and
 * flattening that to one answer would make the nesting unusable.
 */
export class RegionSubject extends ConditionSubject {
    override readonly id = "region";

    override resolve(
        _definition: ConditionDefinition,
        subjectId: string | null,
        _targetId: string | null,
        context: RuleContext,
    ): unknown {
        if (subjectId === null) return undefined;
        return context.regionsOf(subjectId);
    }
}
