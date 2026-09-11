import { EffectExecutor } from "../EffectExecutor";
import type { EffectDefinition } from "../EffectDefinition";
import type { RuleContext } from "../RuleContext";

/* Set or add to one of the session's numbers.
 *
 * Two ways of writing, because counting is not setting. A vote tally
 * has to be `add`: two tokens voting in the same frame would each read
 * the old count and write the same new one, and one vote would
 * vanish. `set` is for the values that have an answer rather than a
 * running total.
 *
 * `add` on something that is not a number starts from zero rather than
 * producing `NaN`, which is the difference between a counter that
 * works on the first vote and one that is broken for the rest of the
 * session.
 */
export class UpdateVariableEffect extends EffectExecutor {
    override readonly id = "updateVariable" as const;

    override run(
        definition: EffectDefinition,
        _subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "updateVariable") return;
        if (definition.add !== undefined) {
            const was = context.variable(definition.key);
            const from = typeof was === "number" ? was : 0;
            context.setVariable(definition.key, from + definition.add);
            return;
        }
        context.setVariable(definition.key, definition.set);
    }
}
