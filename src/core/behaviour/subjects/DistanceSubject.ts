import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* How far the event's subject is from its target, in pixels.
 *
 * The one condition that needs both ends of the event, which is why
 * `resolve` takes a target at all. A rule written with a distance and
 * no target — a tap has none — resolves to nothing and therefore
 * fails, rather than comparing against a distance it invented.
 */
export class DistanceSubject extends ConditionSubject {
    override readonly id = "distance";

    override resolve(
        _definition: ConditionDefinition,
        subjectId: string | null,
        targetId: string | null,
        context: RuleContext,
    ): unknown {
        if (subjectId === null || targetId === null) return undefined;
        return context.distanceBetween(subjectId, targetId) ?? undefined;
    }
}
