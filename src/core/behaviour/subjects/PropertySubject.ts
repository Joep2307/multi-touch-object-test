import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* Something the programme itself stored on this object.
 *
 * The other half of the extension agreement: a programme may keep its
 * own keys on an instance, and this is how it reads one back. The core
 * never looks inside, which is what makes adding a key harmless.
 */
export class PropertySubject extends ConditionSubject {
    override readonly id = "property";

    override resolve(
        definition: ConditionDefinition,
        subjectId: string | null,
        _targetId: string | null,
        context: RuleContext,
    ): unknown {
        const key = definition.subject;
        if (key === undefined || subjectId === null) return undefined;
        return context.instance(subjectId)?.properties[key];
    }
}
