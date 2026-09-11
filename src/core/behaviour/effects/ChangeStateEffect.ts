import { EffectExecutor } from "../EffectExecutor";
import { targetOf } from "./targetOf";
import type { EffectDefinition } from "../EffectDefinition";
import type { PhysicalId } from "../../physical/PhysicalId";
import type { RuleContext } from "../RuleContext";
import type { StateId } from "../StateId";

/* Move an object to another state.
 *
 * The effect that makes a second tap do nothing, by way of the state
 * it moves to no longer listing the action. It sets the state
 * directly rather than looking for a transition: an action and a
 * transition are two applications of one grammar, and an action that
 * had to find a transition to do its work would be the one depending
 * on the other.
 */
export class ChangeStateEffect extends EffectExecutor {
    override readonly id = "changeState" as const;

    override run(
        definition: EffectDefinition,
        subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "changeState") return;
        const id = targetOf(definition.target, subjectId);
        if (id === null) return;
        context.assign(id as PhysicalId, {
            currentStateId: definition.stateId as StateId,
        });
    }
}
