import { affordanceNames } from "../../physical";
import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* What this object physically permits.
 *
 * Resolves to the list a programme is allowed to see, not to the
 * affordance classes underneath: `viewThrough` rather than an
 * `Apertured` carrying a hole diameter. A rule reasoning about the
 * hole's size would be reasoning about the manufacturing.
 */
export class AffordanceSubject extends ConditionSubject {
    override readonly id = "affordance";

    override resolve(
        _definition: ConditionDefinition,
        subjectId: string | null,
        _targetId: string | null,
        context: RuleContext,
    ): unknown {
        if (subjectId === null) return undefined;
        const kind = context.kindOf(subjectId);
        return kind === null ? undefined : affordanceNames(kind);
    }
}
