/* What the base needs to know about the object it is measuring.
 *
 * This is the small slice of `PhysicalKind` that the kinematics care
 * about. It exists as its own type so that phases 2 to 4 can be built
 * and tested before kinds exist at all — in phase 5 `PhysicalKind`
 * grows a field of this type and nothing here changes.
 *
 * `footRadiusMM` is centre to foot: what the fit measures.
 * `outerDiameterMM` is the physical edge of the object: what gets
 * drawn. They are different numbers and conflating them is exactly
 * the mistake the table makes today, where the ring is drawn at
 * `CFG.puckRadiusMM` (45 mm, so 90 mm across) on an 80 mm puck.
 */
export type FootprintSpec = {
    readonly expectedCount: number;
    readonly footRadiusMM: number;
    readonly outerDiameterMM: number;
};
