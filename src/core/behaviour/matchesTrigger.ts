import type { InteractionEvent } from "../events";
import type { PhysicalInstance } from "../physical";
import type { RuleContext } from "./RuleContext";
import type { TriggerDefinition } from "./TriggerDefinition";

/* Does this event concern this rule at all?
 *
 * Deliberately cheap and deliberately coarse. It runs for every rule
 * on every event, so it asks only what can be answered from the event
 * and one lookup: the type, and whether the source and target are the
 * sort of thing the rule is about. Everything finer is a condition.
 *
 * A filter matches a physical's id, its kind or its role, in that
 * order. One string covers all three because that is how a programme
 * thinks — "when a voting token is tapped" and "when *this* puck is
 * tapped" are the same sentence with a different noun — and because
 * the three id spaces do not overlap.
 */
export function matchesTrigger(
    trigger: TriggerDefinition,
    event: InteractionEvent,
    context: RuleContext,
): boolean {
    if (trigger.eventType !== event.type) return false;
    return (
        matchesFilter(trigger.sourceFilter, event.sourceId, context) &&
        matchesFilter(trigger.targetFilter, event.targetId, context)
    );
}

function matchesFilter(
    filter: string | undefined,
    id: string | null,
    context: RuleContext,
): boolean {
    if (filter === undefined) return true;
    if (id === null) return false;
    if (filter === id) return true;
    const instance: PhysicalInstance | null = context.instance(id);
    if (instance === null) return false;
    return instance.kindId === filter || instance.roleId === filter;
}
