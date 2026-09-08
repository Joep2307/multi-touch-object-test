/* What a completed contact episode turned out to be.
 *
 * `none` while nothing has happened yet or the last episode was
 * neither: too long for a tap and too short for a hold, or it moved
 * too far to be either.
 */
export type TapKind = "none" | "tap" | "double" | "hold";
