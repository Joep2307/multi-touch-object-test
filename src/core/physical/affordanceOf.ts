import type { Affordance } from "./affordance/Affordance";
import type { PhysicalKindDefinition } from "./PhysicalKindDefinition";

/* Find one affordance on a kind, typed.
 *
 * The whole point of affordances is that a caller asks "can this
 * object physically do X" rather than "is this a puck". This is the
 * one place that question is answered, so it is also the one place
 * that would have to change if affordances ever stop being a plain
 * array.
 *
 * Returns `null` rather than throwing: not having an affordance is
 * the normal case, not an error.
 */
export function affordanceOf<T extends Affordance>(
    kind: PhysicalKindDefinition,
    ctor: new (...args: never[]) => T,
): T | null {
    for (const a of kind.affordances) {
        if (a instanceof ctor) return a;
    }
    return null;
}
