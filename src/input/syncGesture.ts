import { touches } from "../state/touches";
import { mapMovable } from "./mapMovable";

/* Derive the map gesture from the real touches: one finger pans, two
   fingers pinch, more than that is not a gesture. */
export function syncGesture(): void {
    if (!mapMovable()) {
        touches.gesture = null;
        return;
    }
    const pts = [...touches.real.entries()];
    if (pts.length === 1) {
        touches.gesture = {
            n: 1,
            id: pts[0][0],
            x: pts[0][1].x,
            y: pts[0][1].y,
        };
    } else if (pts.length === 2) {
        const a = pts[0][1],
            b = pts[1][1];
        touches.gesture = {
            n: 2,
            ids: [pts[0][0], pts[1][0]],
            d: Math.hypot(a.x - b.x, a.y - b.y),
            mx: (a.x + b.x) / 2,
            my: (a.y + b.y) / 2,
        };
    } else touches.gesture = null;
}
