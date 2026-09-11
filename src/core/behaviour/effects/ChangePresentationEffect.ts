import { EffectExecutor } from "../EffectExecutor";
import { targetOf } from "./targetOf";
import type { EffectDefinition } from "../EffectDefinition";
import type { RuleContext } from "../RuleContext";

/* Ask for something to be drawn differently.
 *
 * The other effect that reaches outside, and the same answer: a
 * request on the outbox. The core computes what to show and never
 * shows it, which is the whole reason the presentation layer can be
 * replaced without the rules noticing.
 */
export class ChangePresentationEffect extends EffectExecutor {
    override readonly id = "changePresentation" as const;

    override run(
        definition: EffectDefinition,
        subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "changePresentation") return;
        const id = targetOf(definition.target, subjectId);
        if (id === null) return;
        context.request({
            type: "changePresentation",
            target: id,
            presentationId: definition.presentationId,
            at: context.at,
        });
    }
}
