import { evaluateCondition } from "./evaluateCondition";
import type { ConditionDefinition } from "./ConditionDefinition";
import type { ConditionRegistry } from "./ConditionRegistry";
import type { InteractionEvent } from "../events/InteractionEvent";
import type { RuleContext } from "./RuleContext";

/* The first condition that does not hold, or null if they all do.
 *
 * Shared by actions and transitions, because they share a grammar and
 * this is the middle word of it. Two copies would eventually disagree
 * about the order conditions are evaluated in, and the order is
 * load-bearing: a rule reads as a sentence, and the first word that is
 * untrue is the answer to why it did not fire.
 *
 * Stopping at the first is not an optimisation. Evaluating the rest
 * would let a later condition's refusal be reported instead of the
 * real one, and "distance is 400" is a much worse answer than "state
 * is Voted" when both are true.
 */
export function firstUnmetCondition(
    conditions: readonly ConditionDefinition[],
    event: InteractionEvent,
    context: RuleContext,
    registry: ConditionRegistry,
): ConditionDefinition | null {
    for (const condition of conditions) {
        const result = evaluateCondition(
            condition,
            event.sourceId,
            event.targetId,
            context,
            registry,
        );
        if (!result.met) return result.refused;
    }
    return null;
}
