import type { ConditionDefinition } from "./ConditionDefinition";
import type { RuleContext } from "./RuleContext";

/* Where one kind of condition looks, and nothing else.
 *
 * A subject resolves to a value; comparing it is somebody else's job.
 * That split is the point of this class. The nine condition types
 * differ only in *what* they look at — a role id, a variable, a
 * distance — while the eight operators are identical for all of them.
 * One evaluator class per type, each re-implementing `lte`, would be
 * eight comparisons written nine times, and the ninth would eventually
 * be subtly different from the other eight.
 *
 * A programme that needs a condition the core does not have registers
 * one of these, and every operator works on it the day it is added.
 */
export abstract class ConditionSubject {
    abstract readonly id: string;

    /* The value to compare, or `undefined` when there is nothing to
       compare — an object with no role, a variable never set. A
       condition on `undefined` fails rather than throwing: a rule that
       asks about something absent has its answer. */
    abstract resolve(
        definition: ConditionDefinition,
        subjectId: string | null,
        targetId: string | null,
        context: RuleContext,
    ): unknown;
}
