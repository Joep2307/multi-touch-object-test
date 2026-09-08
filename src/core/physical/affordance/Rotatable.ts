import { Affordance } from "./Affordance";

/* Turning this object means something.
 *
 * Not every object on the glass has a meaningful orientation: a
 * sticker lies flat and a finger has none at all. Marking it here
 * rather than assuming it means `Rotate` can simply be left off a kind
 * that cannot turn, instead of every reader having to ask whether the
 * angle it is looking at is real.
 */
export class Rotatable extends Affordance {
    override readonly id = "rotatable";
}
