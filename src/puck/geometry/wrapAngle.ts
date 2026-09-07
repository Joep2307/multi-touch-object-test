import { puckGeometry } from "./puckGeometry";

/* Wrap an angle back into (−π, π]: the shortest path between two measurements. */
export function wrapAngle(a: number): number {
    const g = puckGeometry.exports;
    if (g) return g.wrap_angle_rad(a);
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}
