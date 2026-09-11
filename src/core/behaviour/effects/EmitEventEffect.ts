import { EffectExecutor } from "../EffectExecutor";
import type { EffectDefinition } from "../EffectDefinition";
import type { RuleContext } from "../RuleContext";

/* Say that something happened, in the programme's own words.
 *
 * `custom.vote.cast` and its like. This is how one rule reaches
 * another without either knowing the other exists, and it is why the
 * bus queues rather than nests: the emitted event is delivered after
 * the emitting action has finished, so nothing observes a half-applied
 * change.
 */
export class EmitEventEffect extends EffectExecutor {
    override readonly id = "emitEvent" as const;

    override run(
        definition: EffectDefinition,
        subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "emitEvent") return;
        context.publish({
            type: definition.eventType,
            sourceId: subjectId,
            targetId: null,
            timestamp: context.at,
            payload: definition.payload ?? {},
            properties: {},
        });
    }
}
