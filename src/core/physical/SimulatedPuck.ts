import { Puck } from "./Puck";

/* A drag copy from the tray: a puck on screen but not on the glass.
 *
 * Extends `Puck` rather than sitting under `VirtualPhysical`, and the
 * distinction matters. A simulated puck genuinely produces contact
 * points — `SimulatedContactSource` emits them — so everything below
 * it works unchanged, which is exactly what makes it useful for
 * development. `VirtualPhysical` is for things that produce no
 * contacts at all.
 *
 * Marked `virtual` so anything that must not act on a pretend object
 * can tell. Note that on the real table simulation must stay off:
 * `simMode` kills the puck bar, so the drag copy follows the finger
 * while no puck ever appears.
 */
export class SimulatedPuck extends Puck {
    override readonly virtual = true;
}
