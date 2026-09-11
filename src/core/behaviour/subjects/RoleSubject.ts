import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* What part this object is playing.
 *
 * Not what it is. The same wooden puck is a Voter in one mode and a
 * Player in the next, and almost every rule worth writing is about the
 * role rather than about the wood.
 */
export class RoleSubject extends ConditionSubject {
    override readonly id = "role";

    override resolve(
        _definition: ConditionDefinition,
        subjectId: string | null,
        _targetId: string | null,
        context: RuleContext,
    ): unknown {
        if (subjectId === null) return undefined;
        return context.instance(subjectId)?.roleId ?? undefined;
    }
}
