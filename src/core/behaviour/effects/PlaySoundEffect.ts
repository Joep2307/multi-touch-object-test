import { EffectExecutor } from "../EffectExecutor";
import type { EffectDefinition } from "../EffectDefinition";
import type { RuleContext } from "../RuleContext";

/* Ask for a sound. Do not play one.
 *
 * One of the two effects that reach outside the model, and it stops at
 * a request on the outbox. The core makes no noise, which is what lets
 * a whole afternoon be replayed in a test without the room hearing it.
 */
export class PlaySoundEffect extends EffectExecutor {
    override readonly id = "playSound" as const;

    override run(
        definition: EffectDefinition,
        _subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "playSound") return;
        context.request({
            type: "playSound",
            sound: definition.sound,
            at: context.at,
        });
    }
}
