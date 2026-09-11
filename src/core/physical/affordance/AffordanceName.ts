/* The names a programme file may use for what an object permits.
 *
 * The model lists six; the code has nine classes, and the two sets do
 * not line up one to one. That is deliberate rather than an oversight.
 * The classes carry measurements a recogniser needs — how big the hole
 * is, whether an overlap is legal — and some of them are answers to
 * questions no programme should be asking. This union is the outward
 * face: the vocabulary someone writing a voting session gets to use.
 *
 * `affordanceNames()` is the mapping, and it is the only one.
 * `Opaque` and `Coded` deliberately have no name here — they are facts
 * the recogniser and the layout need, and a programme that reasoned
 * about them would be reasoning about the manufacturing.
 */
export type AffordanceName =
    | "movable"
    | "rotatable"
    | "tappable"
    | "stackable"
    | "viewThrough"
    | "placeable";
