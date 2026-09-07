import type { Point } from "../../types/Point";
import type { Shape } from "../../types/Shape";
import { LAYOUT } from "./layout";
import { puckGeometry } from "./puckGeometry";

/* Describe the triangle formed by three contact points: side ratios, longest
   side, the nose, and the centroid. Null if it's too small — or as long as
   the wasm hasn't loaded yet. */
export function describe(p1: Point, p2: Point, p3: Point): Shape | null {
    const g = puckGeometry.exports;
    if (!g) return null;
    if (!g.describe_triangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)) return null;
    const o = puckGeometry.f64(g.out_ptr(), LAYOUT.DESCRIBE_LEN);
    return {
        ratios: [o[0], o[1]],
        longest: o[2],
        anchor: { x: o[3], y: o[4] },
        chir: o[5] >= 0 ? 1 : -1,
        cx: o[6],
        cy: o[7],
    };
}
