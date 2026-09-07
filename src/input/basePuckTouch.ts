import type { PuckTouch } from "../types/PuckTouch";

/* Snapshot the puck + finger geometry so the next move can be applied as a delta:
   one finger slides the puck, two fingers only twist it — the puck stays put. */
export function basePuckTouch(pt: PuckTouch): void {
    const p = [...pt.ptrs.values()];
    pt.baseRot = pt.puck.rot;
    if (p.length === 1) {
        pt.dx = p[0].x - pt.puck.x;
        pt.dy = p[0].y - pt.puck.y;
    } else {
        pt.baseAngle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
    }
}
