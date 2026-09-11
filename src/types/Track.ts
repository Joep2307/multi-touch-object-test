import type { LatLng } from "./LatLng";
import type { NearbyHit } from "./NearbyHit";
import type { Point } from "./Point";
import type { PuckMenu } from "./PuckMenu";
import type { PuckMode } from "./PuckMode";
import type { Template } from "./Template";
import type { TrackFoot } from "./TrackFoot";
import type { TrackState } from "./TrackState";

/* A puck lying on the table, tracked across frames. Kept by its own
   sequence number, not by its kind: there can be two of the same kind on
   the table, and which one is which follows from where it lies. */
export interface Track {
    id: string;
    tpl: Template;
    x: number;
    y: number;
    /* The angle that drives the ring: `angleOrigin` plus the amplified
       rotation. */
    angle: number;
    measuredAngle: number;
    filteredAngle: number;
    lastRawAngle: number;
    angleOrigin: number;
    rawOrigin: number;
    frames: number;
    state: TrackState;
    /* Whether this frame's reading was a hold rather than a whole
     detection. Drawn the way `incomplete` is drawn, for the same reason:
     the puck is there, and the table can honestly say it is not seeing
     all of it. */
    held: boolean;
    buf: Point[];
    /* The last complete footprint this puck was seen with, by contact id.
     What a two-foot frame is matched against, and what says where the
     missing foot must be. Empty until the puck has been seen whole once,
     which is why two fingers can never open a puck. */
    feet: TrackFoot[];
    conf: number;
    anchorX: number;
    anchorY: number;
    /* Ready to place a marker; `false` after a tap in the viewing hole. */
    armed: boolean;
    flash: number;
    /* The option ring is opened by tapping the viewing hole. */
    ring: boolean;
    tapIdx: number;
    tapT0: number;
    /* Direct map controls: rotation zooms; displacement pans. */
    panOX: number;
    panOY: number;
    panT: number;
    zoomRot: number;
    zoomCarry: number;
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
    /* Cache for the lines to the knowledge graph; see
       drawPuckKnowledgeRelations. */
    kgKey?: string;
    kgRelations?: NearbyHit[];
}
