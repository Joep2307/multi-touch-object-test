import { Affordance } from "./Affordance";

/* Carries a printed identity rather than a pattern of feet.
 *
 * Stickers and cards. Marked now, before any of them exist, because
 * it is what a `CodeCentreSolver` and a `CodeHeadingSource` would key
 * off — and because a printed voter card is the cheap answer to
 * needing twenty identified voters.
 */
export class Coded extends Affordance {
    override readonly id = "coded";
}
