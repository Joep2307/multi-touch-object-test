import type { ContactStatus } from "./ContactStatus";
import type { SensedContact } from "./SensedContact";

/* One physical touch on the glass: the model's `InputContact`.
 *
 * A `SensedContact` plus the one thing only a frame can know — whether
 * this touch is new, continuing or gone. Everything above the contact
 * layer works in these, so nothing above it has to remember the
 * previous frame to tell a landing finger from a resting one.
 *
 * Immutable on purpose. A frame handed to the model must not change
 * under it while it is being read, and the recorder has to be able to
 * hold on to a frame without copying it first. A finger that moves
 * produces a new `ContactPoint` with the same `id`, never a mutated
 * one.
 */
export type ContactPoint = SensedContact & {
    readonly status: ContactStatus;
};
