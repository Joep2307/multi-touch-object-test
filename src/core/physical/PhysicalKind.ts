import type { Affordance } from "./affordance/Affordance";
import type { FootprintSpec } from "../base/FootprintSpec";
import type { KindFamily } from "./KindFamily";
import type { KindId } from "./KindId";
import type { SlotCode } from "./SlotCode";

/* What was manufactured: one entry per physical object design.
 *
 * A descriptor, not a class, because everything that separates one
 * kind from another is configuration — how big it is, how its feet
 * sit, what it physically permits. A new puck design should be one
 * entry in a list, not a new file of code. Subclasses of `Physical`
 * exist only where *behaviour* differs.
 *
 * This is where the old `Template` / `TPL_FACTORY` / `templates[]`
 * end up, unchanged in content.
 *
 * `defaultRole`, `cardinality` and `appearance` join this type in
 * phase 7, when roles exist. They are left off rather than stubbed:
 * a field nothing reads is a field that quietly goes wrong.
 */
export type PhysicalKind = {
    readonly id: KindId;
    readonly label: string;
    readonly family: KindFamily;
    readonly footprint: FootprintSpec;
    readonly affordances: readonly Affordance[];
    /* Only for the `slot` family: which compartments carry a foot.
       Absent for every other family, and `BaseFactory` refuses a slot
       kind without it rather than guessing. */
    readonly slotCode?: SlotCode;
    /* Still supported, but nothing new is made in this shape. */
    readonly legacy: boolean;
};
