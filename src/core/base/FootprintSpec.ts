/* What the base needs to know about the object it is measuring.
 *
 * This is the small slice of a kind that the kinematics care about. It
 * exists as its own type so that phases 2 to 4 could be built and
 * tested before kinds existed at all, and it is now the `geometry` of
 * a `PhysicalSignature` — a kind describes what it is, a signature
 * describes one way of recognising it, and only the shape reaches
 * here.
 *
 * `footRadiusMM` is **the quantity this kind's solver measures**, in
 * millimetres: the mean distance from the centroid to the feet for a
 * `CentroidSolver`, the fitted circle's radius for a
 * `CircleFitSolver`. Not the radius of the circle through the feet,
 * and not half the outer diameter. Written by hand, the number and
 * the measurement it is compared against become two different
 * quantities — which they did, and the difference was enough to make
 * the standard footprint unrecognisable.
 *
 * `footRadiusSpreadMM` is how much those distances vary **for a
 * perfect example of this kind**. Zero for a ring, and zero for an
 * equilateral triad — but an equilateral triad has no nose, so the
 * standard three-point footprint is deliberately *not* equilateral and
 * its spread is deliberately *not* zero. Scoring the measured spread
 * against zero therefore punishes exactly the asymmetry that makes the
 * heading readable. Absent means zero, which is right for every ring
 * kind.
 *
 * `outerDiameterMM` is the physical edge of the object: what gets
 * drawn. It is a different number from `footRadiusMM`, and conflating
 * them is the mistake the table made when it drew an 80 mm puck at
 * `CFG.puckRadiusMM` 45, so 90 mm across. A kind states its own edge
 * here rather than borrowing the drawing's.
 *
 * Use `footprintFrom()` rather than writing these numbers by hand.
 */
export type FootprintSpec = {
    readonly expectedCount: number;
    readonly footRadiusMM: number;
    readonly footRadiusSpreadMM?: number;
    readonly outerDiameterMM: number;
};
