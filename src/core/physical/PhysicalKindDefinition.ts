import type { Affordance } from "./affordance/Affordance";
import type { ExtensionProperties } from "../programme/ExtensionProperties";
import type { KindId } from "./KindId";
import type { PhysicalSignature } from "./PhysicalSignature";
import type { PresentationId } from "../presentation/PresentationId";
import type { RoleId } from "../session/RoleId";
import type { StateMachineId } from "../behaviour/StateMachineId";

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
 * `signatures` is non-empty by type rather than by convention: a kind
 * nothing can recognise is not a kind, and stating it here means no
 * validator has to catch it later and no reader has to handle the
 * empty case. Several signatures means several ways of reading the
 * same object — three feet, or five on a ring — and an instance runs
 * on exactly one of them.
 *
 * The three ids are optional because the things they name do not exist
 * yet: roles arrive in phase D, state machines in phase C,
 * presentations in phase E. They are typed rather than left as strings
 * so that landing those phases is filling them in, not widening every
 * call site. `ModelValidator` in phase F is what turns a dangling id
 * into an error; the compiler cannot, because the target lives in a
 * JSON file.
 */
export type PhysicalKindDefinition = {
    readonly id: KindId;
    readonly label: string;
    readonly signatures: readonly [PhysicalSignature, ...PhysicalSignature[]];
    readonly affordances: readonly Affordance[];
    readonly defaultRoleId?: RoleId;
    readonly stateMachineId?: StateMachineId;
    readonly presentationId?: PresentationId;
    readonly properties?: ExtensionProperties;
    /* Still supported, but nothing new is made in this shape. */
    readonly legacy: boolean;
};
