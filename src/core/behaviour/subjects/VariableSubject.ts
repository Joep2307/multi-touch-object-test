import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* One of the session's own numbers: how many votes, which round.
 *
 * `subject` names which variable, and it is the field's main reason
 * for existing — every other subject type has exactly one thing to
 * look at, and this one has as many as the programme invents.
 */
export class VariableSubject extends ConditionSubject {
    override readonly id = "variable";

    override resolve(
        definition: ConditionDefinition,
        _subjectId: string | null,
        _targetId: string | null,
        context: RuleContext,
    ): unknown {
        const key = definition.subject;
        if (key === undefined) return undefined;
        return context.variable(key);
    }
}
