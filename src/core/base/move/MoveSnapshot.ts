import type { Vec2 } from "../Vec2";

/* Where the object went.
 *
 * `deltaFrame` is this frame's displacement of the *smoothed* centre,
 * and it is the number every derived trait should build on: raw
 * frame-to-frame centres carry the sensor's noise, and anything that
 * differentiates them — speed, acceleration — multiplies that noise
 * rather than the movement.
 *
 * `from` is where the current movement started, not where the object
 * was placed. `deltaTotal` is measured from where it was placed. The
 * two answer different questions — "how far in this gesture" against
 * "how far from home" — and collapsing them into one number is how
 * a pan that reverses ends up reading as no movement at all.
 *
 * `travelledPX` is path length, and only accumulates while moving, so
 * an object resting on the glass for ten minutes does not slowly
 * accumulate a kilometre of jitter.
 */
export type MoveSnapshot = {
    readonly moving: boolean;
    readonly from: Vec2 | null;
    readonly to: Vec2 | null;
    readonly deltaFrame: Vec2;
    readonly deltaTotal: Vec2;
    readonly distancePX: number;
    readonly travelledPX: number;
};
