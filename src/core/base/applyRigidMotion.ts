import { FULL_TURN_DEG } from "./direction/constants";
import type { RigidMotion } from "./RigidMotion";
import type { Vec2 } from "./Vec2";

/* Carry one point along a motion measured from other points.
 *
 * This is the whole of what reconstruction is: the two feet that are
 * still on the glass say how the object turned and where it went, and
 * the foot that is not says nothing at all — it simply goes where the
 * rigid body took it. A puck is rigid, so that is not an estimate.
 */
export function applyRigidMotion(point: Vec2, motion: RigidMotion): Vec2 {
    const rad = (motion.angleDeg * 2 * Math.PI) / FULL_TURN_DEG;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = point.x - motion.from.x;
    const dy = point.y - motion.from.y;
    return {
        x: motion.to.x + dx * cos - dy * sin,
        y: motion.to.y + dx * sin + dy * cos,
    };
}
