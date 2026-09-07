import type { LatLng } from "./LatLng";
import type { PuckMenu } from "./PuckMenu";
import type { PuckMode } from "./PuckMode";

/* The state of a puck that just left the table, at most CFG.puckMemoryMS
   old. If the same kind comes back at roughly the same spot, it picks this
   state back up instead of starting over as a new puck. */
export interface PuckMemory {
    tplId: string;
    x: number;
    y: number;
    t: number;
    menu: PuckMenu;
    mode: PuckMode;
    topicIdx: number;
    pinId?: string | null;
    armed: boolean;
    angleOrigin: number;
    zoomAnchor: LatLng | null;
}
