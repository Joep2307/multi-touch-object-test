import { matchesTrigger } from "./matchesTrigger";
import { byPriority } from "./byPriority";
import { firstUnmetCondition } from "./firstUnmetCondition";
import type { InteractionEvent } from "../events";
import type { ActionDefinition } from "./ActionDefinition";
import type { ActionId } from "./ActionId";
import type { ConditionRegistry } from "./ConditionRegistry";
import type { EffectDefinition } from "./EffectDefinition";
import type { EffectRegistry } from "./EffectRegistry";
import type { RuleContext } from "./RuleContext";
import type { RuleTrace } from "./RuleTrace";

/* When, provided that, then — for every action a programme defined.
 *
 * The order is the whole of this class and it is not arbitrary.
 * Triggers first, because they are cheap and reject almost everything.
 * Then whether the action is enabled at all — the state's list
 * intersected with the mode's — because an action a token cannot
 * currently take should not have its conditions evaluated, let alone
 * appear in a trace as having failed one. Only then the conditions, in
 * the order the programme wrote them, stopping at the first that does
 * not hold: a rule reads as a sentence and the first word that is
 * untrue is the answer.
 *
 * Every outcome reaches the trace, including the refusals. That is
 * what turns "I tapped it and nothing happened" from an investigation
 * into a glance.
 */
export class RuleEngine {
    constructor(
        private readonly actions: readonly ActionDefinition[],
        private readonly conditions: ConditionRegistry,
        private readonly effects: EffectRegistry,
        private readonly trace: RuleTrace,
    ) {}

    /* Returns the actions that fired, in the order they fired.
     *
     * Reported rather than left to be read off the trace. The trace is
     * a bounded debugging aid — it drops its oldest entries after a
     * couple of hundred — so anything that inferred "what just fired"
     * by watching it grow would quietly start reporting nothing once
     * the table had been running for a minute. The log's record of
     * what consumed an event is not a debugging aid. */
    handle(
        event: InteractionEvent,
        context: RuleContext,
    ): readonly ActionId[] {
        const fired: ActionId[] = [];
        for (const action of byPriority(this.actions)) {
            if (!matchesTrigger(action.trigger, event, context)) continue;

            const enabled = context.enabledActionIds(event.sourceId);
            if (enabled !== null && !enabled.has(action.id)) {
                this.trace.add({
                    eventType: event.type,
                    ruleId: action.id,
                    ruleKind: "action",
                    at: event.timestamp,
                    outcome: "notEnabled",
                    stateId:
                        event.sourceId === null
                            ? null
                            : (context.instance(event.sourceId)
                                  ?.currentStateId ?? null),
                });
                continue;
            }

            const refused = firstUnmetCondition(
                action.conditions,
                event,
                context,
                this.conditions,
            );
            if (refused !== null) {
                this.trace.add({
                    eventType: event.type,
                    ruleId: action.id,
                    ruleKind: "action",
                    at: event.timestamp,
                    outcome: "refused",
                    reason: refused,
                });
                continue;
            }

            this.#run(action.effects, event.sourceId, context);
            fired.push(action.id);
            this.trace.add({
                eventType: event.type,
                ruleId: action.id,
                ruleKind: "action",
                at: event.timestamp,
                outcome: "fired",
            });
        }
        return fired;
    }

    #run(
        effects: readonly EffectDefinition[],
        subjectId: string | null,
        context: RuleContext,
    ): void {
        for (const effect of effects) {
            this.effects.run(effect, subjectId, context);
        }
    }
}
