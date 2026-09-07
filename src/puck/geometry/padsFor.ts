import type { Point } from "../../types/Point";
import type { Template } from "../../types/Template";
import { LAYOUT } from "./layout";
import { puckGeometry } from "./puckGeometry";

/* The three pads of a template around its centroid, with longest side
   `Lm` (in whatever unit you feed in: millimeters for the build drawing,
   pixels for a drag copy). */
export function padsFor(tpl: Template, Lm: number): Point[] {
    const g = puckGeometry.exports;
    if (!g) return [];
    g.pads_for_template(tpl.ratios[0], tpl.ratios[1], Lm);
    const o = puckGeometry.f64(g.out_ptr(), LAYOUT.PADS_LEN);
    return [
        { x: o[0], y: o[1] },
        { x: o[2], y: o[3] },
        { x: o[4], y: o[5] },
    ];
}
