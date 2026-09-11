import { EffectExecutor } from "../EffectExecutor";
import type { EffectDefinition } from "../EffectDefinition";
import type { RuleContext } from "../RuleContext";

/* Ask to be told again later.
 *
 * The delay is measured against the frame clock, never a wall clock
 * and never `setTimeout`. A timer on a real clock would fire at a
 * different point in a replay than in the session it came from, which
 * would stop the log replaying at all — and the log is what undo,
 * the analysis export and the afternoon's vote count are built on.
 */
export class StartTimerEffect extends EffectExecutor {
    override readonly id = "startTimer" as const;

    override run(
        definition: EffectDefinition,
        subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "startTimer") return;
        /* The object that asked rides along, so the event that comes
           back can be aimed at it. A timer whose event had no source
           could never move that object to another state, which is
           most of what a timer is started for. */
        context.startTimer(definition.name, definition.afterMS, subjectId);
    }
}
