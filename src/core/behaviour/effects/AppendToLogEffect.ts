import { EffectExecutor } from "../EffectExecutor";
import type { EffectDefinition } from "../EffectDefinition";
import type { RuleContext } from "../RuleContext";

/* Write something into the record on purpose.
 *
 * The log already holds every event, so this is not how a session is
 * recorded — it is how a programme leaves a note in its own words
 * beside the machinery. "Round two closed" is worth more to whoever
 * reads the afternoon back than the eleven events it took.
 */
export class AppendToLogEffect extends EffectExecutor {
    override readonly id = "appendToLog" as const;

    override run(
        definition: EffectDefinition,
        subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "appendToLog") return;
        context.appendToLog(definition.note, {
            ...definition.payload,
            ...(subjectId === null ? {} : { subjectId }),
        });
    }
}
