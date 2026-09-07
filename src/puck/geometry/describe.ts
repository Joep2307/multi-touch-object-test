import type { Point } from "../../types/Point";
import type { Shape } from "../../types/Shape";
import { dist } from "./dist";

/* Describe the triangle formed by three contact points: side ratios, the
   longest side, the nose, and the centroid. Null if it is too small. */
export function describe(p1: Point, p2: Point, p3: Point): Shape | null {
    const e = [
        { d: dist(p1, p2), a: p1, b: p2, o: p3 },
        { d: dist(p2, p3), a: p2, b: p3, o: p1 },
        { d: dist(p3, p1), a: p3, b: p1, o: p2 },
    ].sort((x, y) => x.d - y.d);
    const long = e[2];
    if (long.d < 1) return null;
    const anchor = long.o;
    let P = long.a,
        Q = long.b;
    if (dist(Q, anchor) < dist(P, anchor)) {
        const t = P;
        P = Q;
        Q = t;
    }
    const cross =
        (Q.x - P.x) * (anchor.y - P.y) - (Q.y - P.y) * (anchor.x - P.x);
    return {
        ring: false,
        ratios: [e[0].d / long.d, e[1].d / long.d],
        longest: long.d,
        anchor,
        chir: cross >= 0 ? 1 : -1,
        cx: (p1.x + p2.x + p3.x) / 3,
        cy: (p1.y + p2.y + p3.y) / 3,
    };
}
