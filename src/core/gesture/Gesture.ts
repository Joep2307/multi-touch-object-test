/* What a movement turned out to mean.
 *
 * The model's eight, and deliberately no more. Every one of them is a
 * thing a person does to an object — press it, turn it, shake it, put
 * it down — rather than a thing the table concludes from it. What a
 * tap *does* is an action's business; that a tap happened is this.
 *
 * `place` and `remove` are here alongside the movements because from
 * above they are the same kind of fact, even though they come from
 * `Presence` rather than from the kinematics. A rule that fires when
 * a token is put into the voting area should not have to know that one
 * of its inputs arrives by a different road.
 */
export type Gesture =
    | "tap"
    | "doubleTap"
    | "hold"
    | "swipe"
    | "rotate"
    | "shake"
    | "place"
    | "remove";
