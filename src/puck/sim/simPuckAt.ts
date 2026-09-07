import { CFG } from "../../config/CFG";
import { sim } from "../../state/sim";
import { view } from "../../state/view";
import type { SimPuck } from "../../types/SimPuck";

/* Topmost simulated puck under a screen point — a generous, finger-sized hit area. */
export function simPuckAt(x: number, y: number): SimPuck | undefined {
    return sim.pucks
        .slice()
        .reverse()
        .find(
            (s) =>
                Math.hypot(s.x - x, s.y - y) < CFG.puckRadiusMM * view.pxPerMM,
        );
}
