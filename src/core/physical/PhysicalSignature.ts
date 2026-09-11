import type { FootprintSpec } from "../base";
import type { KindFamily } from "./KindFamily";
import type { OrientationRule } from "./OrientationRule";
import type { ScaleRule } from "./ScaleRule";
import type { SignatureId } from "./SignatureId";
import type { SlotCode } from "./SlotCode";

/* One way of recognising one kind of object.
 *
 * The model's sentence for it is "three points in a triangle with at
 * most 5 mm deviation, rotation allowed, scaling not" — a shape, a
 * tolerance, and two rules about what still counts as the same shape.
 *
 * Signatures live on the kind rather than the other way round because
 * a kind can have several: a puck whose feet are read as a triad by
 * one recogniser and as a ring by another is one object, and it should
 * not have to be two kinds to say so. `family` therefore belongs here
 * and not on the kind — the family is what picks the solver and the
 * heading source, and those are properties of how you are reading the
 * object, not of the object.
 *
 * `geometry` wraps `FootprintSpec` rather than replacing it. The base
 * is measured and tested against that type and has been since phase 2;
 * moving it would rewrite tests that are the specification for the
 * Rust port.
 *
 * `distanceToleranceMM` carries its unit in its name, as everything
 * measurable in this tree does. The model calls it `distanceTolerance`.
 */
export type PhysicalSignature = {
    readonly id: SignatureId;
    readonly family: KindFamily;
    /* How many feet this reading expects. Always
       `geometry.expectedCount`; `signatureFrom` is what keeps the two
       from drifting apart. */
    readonly contactCount: number;
    readonly geometry: FootprintSpec;
    readonly distanceToleranceMM: number;
    readonly orientationRule: OrientationRule;
    readonly scaleRule: ScaleRule;
    /* Only for the `slot` family: which compartments carry a foot.
       Absent for every other family, and `BaseFactory` refuses a slot
       signature without it rather than guessing. */
    readonly slotCode?: SlotCode;
};
