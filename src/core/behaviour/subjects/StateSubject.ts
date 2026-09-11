import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* Where this object stands in its own state machine.
 *
 * The condition that makes a second tap do nothing, and the one a
 * trace most often has to name when somebody asks why nothing
 * happened.
 */
export class StateSubject extends ConditionSubject {
    override readonly id = "state";

    override resolve(
        _definition: ConditionDefinition,
        subjectId: string | null,
        _targetId: string | null,
        context: RuleContext,
    ): unknown {
        if (subjectId === null) return undefined;
        return context.instance(subjectId)?.currentStateId ?? undefined;
    }
}
