import { FULL_TURN_DEG } from "./constants";

/* The signed turn from `from` to `to`, taking the short way round.
 *
 * Always in (-180, 180]. This is what stops a puck that crosses the
 * wrap point from reading as a 359-degree spin: 350° to 10° is +20,
 * not -340.
 *
 * Lives beside the angle convention it depends on, and is its own
 * file because `Rotate` is not the last thing that will need it —
 * anything that compares two headings does.
 */
export function shortestAngleDiffDeg(from: number, to: number): number {
    const raw = (to - from) % FULL_TURN_DEG;
    const wrapped = (raw + FULL_TURN_DEG) % FULL_TURN_DEG;
    return wrapped > FULL_TURN_DEG / 2 ? wrapped - FULL_TURN_DEG : wrapped;
}
