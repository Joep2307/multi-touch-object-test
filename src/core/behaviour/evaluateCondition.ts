import type { ConditionDefinition } from "./ConditionDefinition";
import type { ConditionRegistry } from "./ConditionRegistry";
import type { ConditionResult } from "./ConditionResult";
import type { RuleContext } from "./RuleContext";

const MET: ConditionResult = Object.freeze({ met: true });

/* Does this condition hold?
 *
 * One function, and the only place the eight operators are
 * implemented. Every condition type resolves to a value and then comes
 * through here, so `lte` means the same thing for a distance as for a
 * vote count — which it would not for long if each of ten subject
 * classes compared for itself.
 *
 * A subject that resolves to nothing **fails**. It does not throw and
 * it does not pass: a rule asking about a role on an object that has
 * none has been answered, and the answer is no. Throwing would make a
 * half-built programme crash the table; passing would make a
 * misspelt variable name silently enable everything.
 */
export function evaluateCondition(
    definition: ConditionDefinition,
    subjectId: string | null,
    targetId: string | null,
    context: RuleContext,
    registry: ConditionRegistry,
): ConditionResult {
    const subject = registry.get(definition.type);
    if (subject === null) return refused(definition);
    const actual = subject.resolve(definition, subjectId, targetId, context);
    if (actual === undefined || actual === null) return refused(definition);
    return compare(actual, definition) ? MET : refused(definition);
}

function refused(definition: ConditionDefinition): ConditionResult {
    return { met: false, refused: definition };
}

function compare(actual: unknown, definition: ConditionDefinition): boolean {
    const expected = definition.value;
    switch (definition.operator) {
        case "eq":
            return actual === expected;
        case "ne":
            return actual !== expected;
        case "lt":
        case "lte":
        case "gt":
        case "gte":
            return ordered(actual, expected, definition.operator);
        case "in":
            /* The subject is one of a list. */
            return Array.isArray(expected) && expected.includes(actual);
        case "has":
            /* The subject *is* a list, containing the value. The
               inverse of `in`, and both are needed because either side
               can be the list. */
            return Array.isArray(actual) && actual.includes(expected);
    }
}

/* Only numbers are ordered. Comparing strings with `<` would quietly
   answer questions about alphabetical order that nobody asked, so a
   non-numeric comparison fails rather than inventing a ranking. */
function ordered(
    actual: unknown,
    expected: unknown,
    operator: "lt" | "lte" | "gt" | "gte",
): boolean {
    if (typeof actual !== "number" || typeof expected !== "number") {
        return false;
    }
    switch (operator) {
        case "lt":
            return actual < expected;
        case "lte":
            return actual <= expected;
        case "gt":
            return actual > expected;
        case "gte":
            return actual >= expected;
    }
}
