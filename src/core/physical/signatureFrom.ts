import { footprintFrom } from "../base";
import { solverForFamily } from "./solverForFamily";
import type { Vec2 } from "../base";
import type { KindFamily } from "./KindFamily";
import type { PhysicalSignature } from "./PhysicalSignature";
import type { SignatureId } from "./SignatureId";
import type { SlotCode } from "./SlotCode";

/* Build a signature from where the feet actually are.
 *
 * Every derived number comes from the solver this family will be read
 * by, so a signature's expectations and its measurements are
 * comparable by construction. Writing them by hand is what this
 * function exists to stop: `footRadiusMM` is whatever the solver
 * reports, which is the mean distance to the centroid for one and a
 * fitted radius for another, and the difference is enough to make a
 * perfectly good puck unrecognisable.
 *
 * `contactCount` is taken from the geometry rather than accepted as an
 * argument, for the same reason. Two fields that must agree should
 * have one source.
 *
 * Feet are given in millimetres, in any coordinate frame — only their
 * arrangement matters.
 */
export function signatureFrom(
    id: SignatureId,
    family: KindFamily,
    feetMM: readonly Vec2[],
    outerDiameterMM: number,
    distanceToleranceMM: number,
    slotCode?: SlotCode,
): PhysicalSignature {
    const geometry = footprintFrom(
        feetMM,
        outerDiameterMM,
        solverForFamily(family),
    );
    return {
        id,
        family,
        contactCount: geometry.expectedCount,
        geometry,
        distanceToleranceMM,
        /* Everything on this table is put down whichever way it lands,
           and every one of them is identified partly by its size. A
           signature that wants otherwise says so by being written out
           rather than derived. */
        orientationRule: "free",
        scaleRule: "fixed",
        ...(slotCode === undefined ? {} : { slotCode }),
    };
}
