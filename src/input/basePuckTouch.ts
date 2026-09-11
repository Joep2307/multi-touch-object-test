import type { PuckTouch } from "../types";

/* Snapshot the puck + finger geometry so the next move can be applied as a
   delta: one finger slides the puck, two fingers only twist it — the puck
   stays put. */
export function basePuckTouch(pt: PuckTouch): void {
    const p = [...pt.ptrs.values()];
    const [p0, p1] = p;
    pt.baseRot = pt.puck.rot;
    if (p.length === 1) {
        pt.dx = (p0?.x ?? 0) - pt.puck.x;
        pt.dy = (p0?.y ?? 0) - pt.puck.y;
    } else {
        pt.baseAngle = Math.atan2(
            (p1?.y ?? 0) - (p0?.y ?? 0),
            (p1?.x ?? 0) - (p0?.x ?? 0),
        );
    }
}
