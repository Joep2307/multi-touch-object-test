import type { Point } from "../../types";

/* The three contact points of a triangular puck, as a triple the
   compiler can count.
 *
 * `noUncheckedIndexedAccess` holds for the tests too, so a test that
 * reads `pts[0]` has to say what it does when the list is short. In a
 * test the answer is always the same — a short list is the failure, and
 * the useful thing is to say so where it happens rather than three
 * assertions later. Saying it once here keeps each test about the thing
 * it is testing. */
export function threePoints(pts: readonly Point[]): [Point, Point, Point] {
    const [a, b, c] = pts;
    if (!a || !b || !c) {
        throw new Error(`expected three points, got ${pts.length}`);
    }
    return [a, b, c];
}
