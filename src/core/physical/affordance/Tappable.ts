import { Affordance } from "./Affordance";

/* Putting it down and lifting it again means something.
 *
 * Not every object on the glass can be tapped: a sticker is stuck to
 * the table and a puck being used as a dial is turned rather than
 * pressed. Marking it makes "nothing happened when I tapped it" a
 * property of the object rather than a rule somewhere that forgot to
 * fire.
 *
 * Physically possible, not permitted. Whether a tap *does* anything is
 * the role's business; whether it can be tapped at all is this.
 */
export class Tappable extends Affordance {
    override readonly id = "tappable";
}
