import { sim, view } from "../../state";
import { padsFor } from "../geometry";
import { simContactId } from "./simContactId";
import type { TouchPoint } from "../../types";

/* The contact points the drag copies would make if they were real.
 *
 * `padsFor` lays a template's feet out in the same order every time, so a
 * pad's place in that list is as stable an identity as a pointer id is for
 * a finger. That is what lets a simulated puck hold on with two feet the
 * same way a real one does. */
export function simPads(): TouchPoint[] {
    const out: TouchPoint[] = [];
    for (const s of sim.pucks) {
        const pads = padsFor(s.tpl, view.pxPerMM);
        for (let i = 0; i < pads.length; i++) {
            const p = pads[i];
            if (!p) continue;
            const c = Math.cos(s.rot),
                si = Math.sin(s.rot);
            out.push({
                id: simContactId(s.uid, i),
                x: s.x + p.x * c - p.y * si,
                y: s.y + p.x * si + p.y * c,
                sim: true,
                uid: s.uid,
            });
        }
    }
    return out;
}
