import type { RegionCrossing } from "./RegionCrossing";
import type { RegionId } from "./RegionId";

/* What one frame's worth of looking at the regions produced. */
export type RegionUpdate = {
    readonly membership: ReadonlyMap<string, readonly RegionId[]>;
    readonly entered: readonly RegionCrossing[];
    readonly exited: readonly RegionCrossing[];
};
