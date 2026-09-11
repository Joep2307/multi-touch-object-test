import type { Vec2 } from "../core/base";

/* Where a ring puck's feet sit: `angles` degrees around a circle of
   `ringMM`, the way the old templates record them.
 *
 * A slot-coded puck is the same thing with its angles derived from
 * which of its twelve compartments carry a foot, so both families come
 * through here.
 */
export function ringCornersMM(
    ringMM: number,
    anglesDeg: readonly number[],
): readonly Vec2[] {
    return anglesDeg.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return { x: ringMM * Math.cos(rad), y: ringMM * Math.sin(rad) };
    });
}
