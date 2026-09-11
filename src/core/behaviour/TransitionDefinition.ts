import type { ConditionDefinition } from "./ConditionDefinition";
import type { EffectDefinition } from "./EffectDefinition";
import type { StateId } from "./StateId";
import type { TransitionId } from "./TransitionId";
import type { TriggerDefinition } from "./TriggerDefinition";

/* The same grammar, bound to a move between two states.
 *
 * One grammar, two applications. A transition is only reachable from
 * the state it leaves, which is why it has no priority and no
 * enabled-ness: being in `fromStateId` is the whole of its
 * permission.
 */
export type TransitionDefinition = {
    readonly id: TransitionId;
    readonly fromStateId: StateId;
    readonly toStateId: StateId;
    readonly trigger: TriggerDefinition;
    readonly conditions: readonly ConditionDefinition[];
    readonly effects: readonly EffectDefinition[];
};
