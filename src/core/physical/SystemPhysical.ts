import { VirtualPhysical } from "./VirtualPhysical";

/* The table itself, as an actor.
 *
 * This class matters more than it looks. Modelling the table as a
 * physical means a phase timing out, the kiosk recovering or a
 * scheduled wipe enters the session through the same funnel as a
 * visitor placing a marker, and lands in the journal the same way.
 * The alternative is a second, invisible code path for "the system did
 * it" — and then every export, every replay and every undo needs a
 * special case for the half of the history that did not go through the
 * front door.
 */
export class SystemPhysical extends VirtualPhysical {}
