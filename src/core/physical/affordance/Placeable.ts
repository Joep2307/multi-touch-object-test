import { Affordance } from "./Affordance";

/* Belongs somewhere: it is put into a region rather than merely used
   where it lies.
 *
 * A voting token is placed — dropping it in the voting area is the
 * whole act. A control dial is not; it works wherever it sits, and
 * carrying it into a region should not be read as putting it there.
 * Without the distinction, every region has to guess which of the two
 * an object crossing its edge is.
 */
export class Placeable extends Affordance {
    override readonly id = "placeable";
}
