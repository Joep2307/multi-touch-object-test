import type { EventType } from "../events";
import type { ActionId } from "./ActionId";
import type { ConditionDefinition } from "./ConditionDefinition";
import type { StateId } from "./StateId";
import type { TransitionId } from "./TransitionId";

/* What the engine did with one event, and what it refused.
 *
 * The refusals are the valuable half. "I tapped it and nothing
 * happened" is the most common sentence at a table with visitors, and
 * a trace that only records what fired cannot answer it. With the
 * refusal in hand the overlay can say *state is Voted, not Ready* and
 * there is nothing left to investigate.
 *
 * Every entry names the rule, so a programme with two rules on the
 * same event can be told apart. `reason` is the condition definition
 * itself rather than a sentence, so the log stays machine-readable and
 * the overlay can render it in whatever language the table is in.
 */
export type RuleTraceEntry = {
    readonly eventType: EventType;
    readonly ruleId: ActionId | TransitionId;
    readonly ruleKind: "action" | "transition";
    readonly at: number;
    readonly outcome: "fired" | "refused" | "notEnabled";
    readonly reason?: ConditionDefinition;
    /* Which state the object was in. Only useful on a `notEnabled`
       entry, and there it is the whole answer: an action a state does
       not list has no conditions to have failed, so without this the
       trace could only say "not available" and leave the obvious next
       question unanswered. */
    readonly stateId?: StateId | null;
};
