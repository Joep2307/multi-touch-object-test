import { touches } from "../state";
import type { PuckTouch } from "../types";

/* A finger that lands next to the pucks belongs to whichever grip is closest
   to it. */
export function nearestPuckTouch(x: number, y: number): PuckTouch | null {
    let best: PuckTouch | null = null,
        bd = Infinity;
    for (const t of touches.puckTouches) {
        const d = Math.hypot(t.puck.x - x, t.puck.y - y);
        if (d < bd) {
            bd = d;
            best = t;
        }
    }
    return best;
}
