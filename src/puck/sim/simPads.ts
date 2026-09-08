import { sim } from "../../state/sim";
import { view } from "../../state/view";
import type { TouchPoint } from "../../types/TouchPoint";
import { padsFor } from "../geometry/padsFor";

/* The contact points the drag copies would make if they were real. */
export function simPads(): TouchPoint[] {
    const out: TouchPoint[] = [];
    for (const s of sim.pucks)
        for (const p of padsFor(s.tpl, view.pxPerMM)) {
            const c = Math.cos(s.rot),
                si = Math.sin(s.rot);
            out.push({
                x: s.x + p.x * c - p.y * si,
                y: s.y + p.x * si + p.y * c,
                sim: true,
                uid: s.uid,
            });
        }
    return out;
}
