import type { CircleFit } from "../../types/CircleFit";
import type { Point } from "../../types/Point";

/* The centre of a ring puck is not the centroid of its five points: the
   feet sit unevenly on purpose, so the centroid drifts towards the crowded
   side. And the centre is exactly where the puck's viewing hole is, so it
   has to be right. Hence a real circle fit (Kasa): a handful of sums and a
   system of two unknowns. */
export function fitCircle(pts: Point[]): CircleFit | null {
    const n = pts.length;
    let sx = 0,
        sy = 0;
    for (const p of pts) {
        sx += p.x;
        sy += p.y;
    }
    const mx = sx / n,
        my = sy / n;
    let Suu = 0,
        Svv = 0,
        Suv = 0,
        Suuu = 0,
        Svvv = 0,
        Suvv = 0,
        Svuu = 0;
    for (const p of pts) {
        const u = p.x - mx,
            v = p.y - my;
        Suu += u * u;
        Svv += v * v;
        Suv += u * v;
        Suuu += u * u * u;
        Svvv += v * v * v;
        Suvv += u * v * v;
        Svuu += v * u * u;
    }
    const det = Suu * Svv - Suv * Suv;
    if (!(Math.abs(det) > 1e-6)) return null; // points on one line
    const b1 = (Suuu + Suvv) / 2,
        b2 = (Svvv + Svuu) / 2;
    const cx = mx + (b1 * Svv - b2 * Suv) / det,
        cy = my + (b2 * Suu - b1 * Suv) / det;
    let sum = 0,
        rmin = Infinity,
        rmax = 0;
    for (const p of pts) {
        const d = Math.hypot(p.x - cx, p.y - cy);
        sum += d;
        if (d < rmin) rmin = d;
        if (d > rmax) rmax = d;
    }
    const r = sum / n;
    return r > 0 ? { cx, cy, r, spread: (rmax - rmin) / r } : null;
}
