import type { Vec2 } from "../Vec2";

/* The object's current linear motion in pixel units.
 *
 * Velocity and acceleration keep their direction; their scalar
 * companions answer the common magnitude questions without forcing
 * every consumer to repeat the same calculation.
 */
export type AccelerationSnapshot = {
    readonly velocity: Vec2;
    readonly speedPXperS: number;
    readonly acceleration: Vec2;
    readonly peakSpeed: number;
};
