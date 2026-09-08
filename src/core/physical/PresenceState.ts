/* Where an object stands with the table.
 *
 *   unseen  never seen, or long since forgotten
 *   placed  on the glass — including briefly not measured, see
 *           `PresencePolicy.holdMS`
 *   lifted  off the glass, still remembered: put it back and it is the
 *           same object with the same history
 *   gone    off long enough that putting it back makes a new object
 *
 * `lifted` is the state that earns its keep. Without it, a puck picked
 * up to point at something and put down again would come back as a
 * stranger, losing whatever it had authored.
 */
export type PresenceState = "unseen" | "placed" | "lifted" | "gone";
