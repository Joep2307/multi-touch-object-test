import { Physical } from "./Physical";

/* A physical that produces no contacts at all, ever.
 *
 * Not "pretend puck" — that is `SimulatedPuck`, which does produce
 * contacts. This is for actors with no presence on the glass: the
 * table itself, and later a phone or a second screen.
 */
export abstract class VirtualPhysical extends Physical {
    override readonly hasPose = false;
    override readonly virtual = true;
}
