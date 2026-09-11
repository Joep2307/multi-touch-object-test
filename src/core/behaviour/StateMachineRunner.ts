import { firstUnmetCondition } from "./firstUnmetCondition";
import { matchesTrigger } from "./TriggerMatcher";
import type { ConditionRegistry } from "./ConditionRegistry";
import type { EffectDefinition } from "./EffectDefinition";
import type { EffectRegistry } from "./EffectRegistry";
import type { InteractionEvent } from "../events/InteractionEvent";
import type { PhysicalId } from "../physical/PhysicalId";
import type { RuleContext } from "./RuleContext";
import type { RuleTrace } from "./RuleTrace";
import type { StateDefinition } from "./StateDefinition";
import type { StateId } from "./StateId";
import type { StateMachineDefinition } from "./StateMachineDefinition";
import type { TransitionId } from "./TransitionId";

/* Moves things between states, and does not care what things.
 *
 * A kind carries a machine, and so may a role or a mode. The runner
 * never asks which: a state machine has no opinion about what is in
 * it, and the moment it did, a programme could not give the session
 * itself a machine — Setup, Voting, Results — with the same three
 * words it gives a token.
 *
 * The order on a transition is exit, then the transition's own
 * effects, then entry, and it is the order anyone would say out loud.
 * The state is changed *before* the entry effects run, so an entry
 * effect that reads the state sees the one it just arrived in rather
 * than the one it left — which is the difference between an entry
 * effect that can light a lamp and one that lights the wrong lamp.
 */
export class StateMachineRunner {
    constructor(
        private readonly machine: StateMachineDefinition,
        private readonly conditions: ConditionRegistry,
        private readonly effects: EffectRegistry,
        private readonly trace: RuleTrace,
    ) {}

    get initialStateId(): StateId {
        return this.machine.initialStateId;
    }

    state(id: StateId | null): StateDefinition | null {
        if (id === null) return null;
        return this.machine.states.find((s) => s.id === id) ?? null;
    }

    /* Put an object into the machine's initial state and run that
       state's entry effects. Not the same as assigning a state: an
       object that arrives in `Ready` should have whatever `Ready` does
       on arrival done to it. */
    enter(subjectId: PhysicalId, context: RuleContext): void {
        context.assign(subjectId, {
            currentStateId: this.machine.initialStateId,
        });
        const state = this.state(this.machine.initialStateId);
        if (state !== null) {
            this.#run(state.entryEffects, subjectId, context);
            this.#announce("state.entered", subjectId, state.id, context);
        }
    }

    /* Returns the transition that fired, or null. Reported rather
       than left to be read off the trace, for the same reason the rule
       engine reports its actions: the trace is bounded and the log is
       not. */
    handle(
        event: InteractionEvent,
        context: RuleContext,
    ): TransitionId | null {
        const subjectId = event.sourceId;
        if (subjectId === null) return null;
        const current = context.instance(subjectId)?.currentStateId ?? null;
        if (current === null) return null;
        /* And it has to be a state *this* machine has. Two machines
           may both call a state `Ready`, and the runner is handed
           every event on the table — so without this the token
           machine would run its own exit and entry effects on a
           control dial and leave it in a state its own machine has no
           way out of. */
        if (this.state(current) === null) return null;

        for (const transition of this.machine.transitions) {
            if (transition.fromStateId !== current) continue;
            if (!matchesTrigger(transition.trigger, event, context)) continue;

            const refused = firstUnmetCondition(
                transition.conditions,
                event,
                context,
                this.conditions,
            );
            if (refused !== null) {
                this.trace.add({
                    eventType: event.type,
                    ruleId: transition.id,
                    ruleKind: "transition",
                    at: event.timestamp,
                    outcome: "refused",
                    reason: refused,
                });
                continue;
            }

            const from = this.state(current);
            const to = this.state(transition.toStateId);
            if (from !== null) {
                this.#run(from.exitEffects, subjectId, context);
                this.#announce("state.exited", subjectId, from.id, context);
            }
            this.#run(transition.effects, subjectId, context);
            context.assign(subjectId as PhysicalId, {
                currentStateId: transition.toStateId,
            });
            if (to !== null) {
                this.#run(to.entryEffects, subjectId, context);
                this.#announce("state.entered", subjectId, to.id, context);
            }
            this.trace.add({
                eventType: event.type,
                ruleId: transition.id,
                ruleKind: "transition",
                at: event.timestamp,
                outcome: "fired",
            });
            /* One transition per event. A machine that took two would
               make the second one's conditions depend on the first
               one's effects, which is a rule nobody could read off the
               definitions. */
            return transition.id;
        }
        return null;
    }

    #run(
        effects: readonly EffectDefinition[],
        subjectId: string,
        context: RuleContext,
    ): void {
        for (const effect of effects) {
            this.effects.run(effect, subjectId, context);
        }
    }

    #announce(
        type: "state.entered" | "state.exited",
        subjectId: string,
        stateId: StateId,
        context: RuleContext,
    ): void {
        context.publish({
            type,
            sourceId: subjectId,
            targetId: null,
            timestamp: context.at,
            payload: { stateId, machineId: this.machine.id },
            properties: {},
        });
    }
}
