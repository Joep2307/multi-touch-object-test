/* How far the object has turned.
 *
 * All three numbers are unwrapped and signed, so a full turn reads as
 * 360 and not as a jump from 359 back to 1, and turning back the way
 * you came subtracts. Positive is the direction angles grow in — see
 * the angle convention in `direction/constants.ts`.
 *
 * `deltaTotalDeg` is measured from the heading the object had when it
 * was placed, which is what makes "turn a bit further" mean the same
 * thing wherever it was put down.
 */
export type RotateSnapshot = {
    readonly turning: boolean;
    readonly deltaFrameDeg: number;
    readonly deltaTotalDeg: number;
    readonly turns: number;
    readonly fromHeadingDeg: number;
};
