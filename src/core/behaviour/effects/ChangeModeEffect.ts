import { EffectExecutor } from "../EffectExecutor";
import type { EffectDefinition } from "../EffectDefinition";
import type { ModeId } from "../../session/ModeId";
import type { RuleContext } from "../RuleContext";

/* Move the whole session into another mode.
 *
 * The only effect that changes what every object on the table can do
 * at once, which is why it belongs to the session rather than to any
 * physical. What that costs — exit effects, initial states, a new
 * table image — is the session's business and happens behind
 * `changeMode`.
 */
export class ChangeModeEffect extends EffectExecutor {
    override readonly id = "changeMode" as const;

    override run(
        definition: EffectDefinition,
        _subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "changeMode") return;
        context.changeMode(definition.modeId as ModeId);
    }
}
