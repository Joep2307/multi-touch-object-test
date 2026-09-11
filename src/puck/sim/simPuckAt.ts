import { CFG } from "../../config";
import { sim, view } from "../../state";
import type { SimPuck } from "../../types";

/* Topmost simulated puck under a screen point — a generous, finger-sized hit
   area. */
export function simPuckAt(x: number, y: number): SimPuck | undefined {
    return sim.pucks
        .slice()
        .reverse()
        .find(
            (s) =>
                Math.hypot(s.x - x, s.y - y) < CFG.puckRadiusMM * view.pxPerMM,
        );
}
