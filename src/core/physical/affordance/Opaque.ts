import { Affordance } from "./Affordance";

/* Covers the map, so panels must dodge it.
 *
 * A physical fact with a direct consequence for layout: a note opened
 * beside an opaque puck has to sit somewhere the puck is not, while
 * one beside an apertured puck can overlap the hole.
 */
export class Opaque extends Affordance {
    override readonly id = "opaque";
}
