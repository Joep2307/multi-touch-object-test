import type { Point } from "../../types/Point";
import type { Template } from "../../types/Template";
import { tplLongest } from "../tplLongest";
import { isRing } from "./isRing";
import { norm360 } from "./norm360";
import { tplRing } from "./tplRing";

/* The contact points of a template, in millimetres times `k`: pass
   `pxPerMM` for the screen, or leave `k` out for millimetres on paper. On a
   ring they lie on the circle around its centre; a triangle is first laid
   around its centroid, because for a triangle that is the heart of the
   puck. */
export function padsFor(tpl: Template, k = 1): Point[] {
    if (isRing(tpl)) {
        const R = tplRing(tpl) * k;
        return [...(tpl.angles ?? [])]
            .map(norm360)
            .sort((a, b) => a - b)
            .map((a) => ({
                x: R * Math.cos((a * Math.PI) / 180),
                y: R * Math.sin((a * Math.PI) / 180),
            }));
    }
    const Lm = tplLongest(tpl) * k;
    const [r1, r2] = tpl.ratios ?? [1, 1];
    const a = r1 * Lm,
        b = r2 * Lm,
        c = Lm;
    const rx = (c * c + b * b - a * a) / (2 * c),
        ry = Math.sqrt(Math.max(0, b * b - rx * rx));
    const pts = [
        { x: 0, y: 0 },
        { x: c, y: 0 },
        { x: rx, y: ry },
    ];
    const cx = (pts[0].x + pts[1].x + pts[2].x) / 3,
        cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
    return pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
}
