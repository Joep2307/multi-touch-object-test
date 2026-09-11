import type { Vec2 } from "../core/base";

/* Where a taped triangle's three corners sit, from the shape the old
   templates record: the longest side in millimetres, and the two
   shorter sides as fractions of it.
 *
 * Only the arrangement matters, so the triangle is placed with its
 * longest side on the x-axis and the third corner solved for as the
 * intersection of two circles. `footprintFrom()` takes it from there
 * and derives the measurements with the same solver that will measure
 * the real thing.
 *
 * Returns an empty array for a triangle that cannot exist — two short
 * sides that do not reach across the long one. Better an empty
 * footprint that fails loudly than a `NaN` that spreads.
 */
export function triadCornersMM(
    longestMM: number,
    ratios: readonly [number, number],
): readonly Vec2[] {
    const [r1, r2] = ratios;
    const c = longestMM;
    const a = r1 * longestMM;
    const b = r2 * longestMM;
    if (!(c > 0) || !(a > 0) || !(b > 0)) return [];
    const x = (c * c + b * b - a * a) / (2 * c);
    const ySquared = b * b - x * x;
    if (ySquared <= 0) return [];
    return [
        { x: 0, y: 0 },
        { x: c, y: 0 },
        { x, y: Math.sqrt(ySquared) },
    ];
}
