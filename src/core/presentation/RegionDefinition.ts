import type { KindId } from "../physical";
import type { ExtensionProperties } from "../programme";
import type { RoleId } from "../session";
import type { PresentationId } from "./PresentationId";
import type { RegionId } from "./RegionId";
import type { RegionShape } from "./RegionShape";

/* A piece of table that means something.
 *
 * "This is the voting area, and it accepts only these kinds of object
 * and these roles." That is where `physical.enteredRegion` and
 * `physical.exitedRegion` come from, which is what the behaviour layer
 * reacts to.
 *
 * `acceptedPhysicalKinds` and `acceptedRoles` do **not** keep anything
 * out — a table cannot stop a block being put down in the wrong place.
 * They mark what arrived as unwelcome, so a rule can say something
 * about it. Absent means everything is welcome.
 */
export type RegionDefinition = {
    readonly id: RegionId;
    readonly name: string;
    readonly shape: RegionShape;
    readonly acceptedPhysicalKinds?: readonly KindId[];
    readonly acceptedRoles?: readonly RoleId[];
    readonly presentationId?: PresentationId;
    readonly properties?: ExtensionProperties;
};
