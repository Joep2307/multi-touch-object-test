import type { LatLng } from "./LatLng";
import type { NearbyHit } from "./NearbyHit";
import type { Point } from "./Point";
import type { PuckMenu } from "./PuckMenu";
import type { PuckMode } from "./PuckMode";
import type { Template } from "./Template";
import type { TrackState } from "./TrackState";

/* A puck lying on the table, tracked across frames. Kept by its own
   sequence number, not by its kind: there can be two of the same kind on
   the table, and which one is which follows from where it lies. */
export interface Track {
    id: string;
    tpl: Template;
    x: number;
    y: number;
    /* The angle that drives the ring: `angleOrigin` plus the amplified rotation. */
    angle: number;
    measuredAngle: number;
    filteredAngle: number;
    lastRawAngle: number;
    angleOrigin: number;
    rawOrigin: number;
    frames: number;
    state: TrackState;
    buf: Point[];
    conf: number;
    anchorX: number;
    anchorY: number;
    /* Ready to place a marker; `false` after a tap in the viewing hole. */
    armed: boolean;
    flash: number;
    menu: PuckMenu;
    mode: PuckMode;
    topicIdx: number;
    /* The state the puck lands in is immediately its first choice. */
    landing: boolean;
    dwellIdx: number;
    dwellT0: number;
    dwellDone: boolean;
    zoomRefY: number | null;
    zoomAnchor: LatLng | null;
    lastSeen?: number;
    pinId?: string | null;
    /* Cache for the lines to the knowledge graph; see drawPuckKnowledgeRelations. */
    kgKey?: string;
    kgRelations?: NearbyHit[];
}
