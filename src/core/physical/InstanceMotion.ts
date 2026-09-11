import type { Vec2 } from "../base/Vec2";

/* How the object is moving, in pixels and seconds.
 *
 * Derived from the smoothed centre, never from raw contacts: anything
 * that differentiates a raw reading multiplies the sensor's noise
 * instead of the movement. That is a property of where these numbers
 * come from, and it is why a consumer can use them directly rather
 * than filtering them again.
 */
export type InstanceMotion = {
    readonly velocity: Vec2;
    readonly speedPXperS: number;
    readonly acceleration: Vec2;
};
