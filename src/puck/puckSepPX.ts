import { CFG } from "../config/CFG";
import { view } from "../state/view";

/* How close two pucks can lie to each other. A puck is a disc, so two centers
   can never be closer together than its width; this measure keeps a
   comfortable margin from that and serves two purposes: rejecting candidates
   that lie too close to an already-chosen puck, and matching a detection to
   the right puck of the same kind. */
export const puckSepPX = (): number => CFG.puckRadiusMM * view.pxPerMM * 0.9;
