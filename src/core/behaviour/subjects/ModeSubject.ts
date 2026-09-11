import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* Which mode the session is in.
 *
 * A condition rather than a filter on the trigger, because a rule that
 * only applies while voting is still a rule about voting — putting the
 * mode in the trigger would scatter the same fact across every trigger
 * in the programme.
 */
export class ModeSubject extends ConditionSubject {
    override readonly id = "mode";

    override resolve(
        _definition: ConditionDefinition,
        _subjectId: string | null,
        _targetId: string | null,
        context: RuleContext,
    ): unknown {
        return context.activeModeId ?? undefined;
    }
}
