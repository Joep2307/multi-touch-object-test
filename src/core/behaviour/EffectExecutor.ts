import type { EffectDefinition } from "./EffectDefinition";
import type { RuleContext } from "./RuleContext";

/* One thing a rule can do.
 *
 * A class each, unlike the condition subjects, and for the opposite
 * reason: conditions differ only in what they look at and share every
 * comparison, while effects share nothing at all. Setting a state and
 * playing a sound have no common shape worth abstracting, so pushing
 * them through one function would only produce a switch with nine arms
 * and a union of every parameter any of them needs.
 *
 * `subjectId` is the physical the event came from, which is what
 * `"self"` resolves to. An effect naming any other target names it
 * outright.
 */
export abstract class EffectExecutor {
    abstract readonly id: EffectDefinition["type"];

    abstract run(
        definition: EffectDefinition,
        subjectId: string | null,
        context: RuleContext,
    ): void;
}
