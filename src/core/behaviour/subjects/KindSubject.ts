import { ConditionSubject } from "../ConditionSubject";
import type { ConditionDefinition } from "../ConditionDefinition";
import type { RuleContext } from "../RuleContext";

/* What kind of object this is: `VotingToken`, `PlayerPiece`.
 *
 * The one condition that is a fact about the manufacturing rather than
 * about the session, which is why a programme reaches for it when it
 * wants a rule for a shape rather than for a part someone is playing.
 */
export class KindSubject extends ConditionSubject {
    override readonly id = "kind";

    override resolve(
        _definition: ConditionDefinition,
        subjectId: string | null,
        _targetId: string | null,
        context: RuleContext,
    ): unknown {
        if (subjectId === null) return undefined;
        return context.instance(subjectId)?.kindId;
    }
}
