import type { StateId } from "../behaviour";
import type { KindId } from "../physical";
import type { ExtensionProperties } from "../programme";
import type { PresentationId } from "./PresentationId";
import type { RegionDefinition } from "./RegionDefinition";

/* Everything the table shows, for one mode.
 *
 * A mode points at one of these, which is how the same objects on the
 * same glass look different in Voting than in Discussion without any
 * of them changing.
 *
 * `physicalPresentations` maps a kind to its drawing, and the
 * per-state override is what makes a voted token look voted. The
 * override is a map rather than a rule because it is not a decision:
 * "in this state, this drawing" has no conditions in it, and dressing
 * it up as behaviour would put the image back in the rules where the
 * whole layer exists to keep it out.
 */
export type TablePresentation = {
    readonly id: PresentationId;
    readonly name: string;
    readonly background?: string;
    readonly regions: readonly RegionDefinition[];
    readonly physicalPresentations: Readonly<Record<KindId, PresentationId>>;
    readonly statePresentations?: Readonly<Record<StateId, PresentationId>>;
    readonly globalPresentations?: readonly PresentationId[];
    readonly properties?: ExtensionProperties;
};
