import { affordanceOf } from "./affordanceOf";
import {
    Apertured,
    Nestable,
    Nesting,
    Passive,
    Placeable,
    Rotatable,
    Tappable,
} from "./affordance";
import type { PhysicalKindDefinition } from "./PhysicalKindDefinition";
import type { AffordanceName } from "./affordance";

/* What a programme file is allowed to say this kind permits.
 *
 * The one place the code's affordance classes are translated into the
 * model's vocabulary, and therefore the one place to look when the two
 * disagree. Three of the six are derived rather than stored:
 *
 *   movable      anything not `Passive` — a sticker stays where it was
 *                stuck, everything else can be picked up
 *   stackable    `Nestable` or `Nesting`; from the object's side,
 *                being able to go inside another and being able to
 *                take one are the same permission to a rule
 *   viewThrough  `Apertured`, which carries the hole's size — a
 *                measurement, and none of a programme's business
 *
 * Deriving rather than storing them is what stops the two vocabularies
 * drifting: there is nothing to keep in step, because there is only
 * one set of facts.
 */
export function affordanceNames(
    kind: PhysicalKindDefinition,
): readonly AffordanceName[] {
    const names: AffordanceName[] = [];
    if (affordanceOf(kind, Passive) === null) names.push("movable");
    if (affordanceOf(kind, Rotatable) !== null) names.push("rotatable");
    if (affordanceOf(kind, Tappable) !== null) names.push("tappable");
    if (
        affordanceOf(kind, Nestable) !== null ||
        affordanceOf(kind, Nesting) !== null
    ) {
        names.push("stackable");
    }
    if (affordanceOf(kind, Apertured) !== null) names.push("viewThrough");
    if (affordanceOf(kind, Placeable) !== null) names.push("placeable");
    return names;
}
