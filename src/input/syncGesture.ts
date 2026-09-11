import { touches } from "../state";
import { mapMovable } from "./mapMovable";

/* Derive the map gesture from the real touches: one finger pans, two
   fingers pinch, more than that is not a gesture. */
export function syncGesture(): void {
    if (!mapMovable()) {
        touches.gesture = null;
        return;
    }
    const pts = [...touches.real.entries()];
    const [first, second] = pts;
    if (pts.length === 1 && first) {
        touches.gesture = {
            n: 1,
            id: first[0],
            x: first[1].x,
            y: first[1].y,
        };
    } else if (pts.length === 2 && first && second) {
        const a = first[1],
            b = second[1];
        touches.gesture = {
            n: 2,
            ids: [first[0], second[0]],
            d: Math.hypot(a.x - b.x, a.y - b.y),
            mx: (a.x + b.x) / 2,
            my: (a.y + b.y) / 2,
        };
    } else touches.gesture = null;
}
