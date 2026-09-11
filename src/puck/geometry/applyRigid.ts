import type { Point, RigidMove } from "../../types";

/* Carry one point along a motion measured from other points. A puck is
   rigid, so where its third foot went is not an estimate. */
export function applyRigid(p: Point, m: RigidMove): Point {
    const c = Math.cos(m.rot),
        s = Math.sin(m.rot);
    const dx = p.x - m.from.x,
        dy = p.y - m.from.y;
    return {
        x: m.to.x + dx * c - dy * s,
        y: m.to.y + dx * s + dy * c,
    };
}
