import { CFG } from "../../config";
import { MV } from "../../map";
import type { Track } from "../../types";

/* Zooming with the puck itself: pushing forward (away from you, up the
   screen) zooms in, pulling toward you zooms out.

   The anchor point is fixed. As soon as you select zoom mode, the map
   location that lay under the crosshair is remembered, and zooming happens
   around that location — not around the puck's center as it currently sits.
   That mattered, because the puck itself slides forward while you push it:
   if you zoomed around its center, the anchor would shift forward with
   every push and the spot you were pointing at would drift out from under
   your hands. Pushing forward is now purely a lever; what it points at is
   already fixed.

   The anchor point is stored as a geographic point, not a screen location:
   that way it stays correct even if the map rotates, pans, or zooms in the
   meantime. A small dead zone keeps jitter in the averaged puck position
   from affecting the zoom level. */
export function applyPuckZoom(t: Track): void {
    if (t.mode !== "zoom" || t.state !== "recognised") {
        t.zoomRefY = t.y;
        t.zoomAnchor = null;
        return;
    }
    if (t.zoomRefY == null) t.zoomRefY = t.y;
    const anchor = t.zoomAnchor ?? (t.zoomAnchor = MV.unproject(t.x, t.y));
    const dy = t.zoomRefY - t.y;
    if (Math.abs(dy) < CFG.puckZoomDeadPX) return;
    const a = MV.project(anchor.lng, anchor.lat);
    MV.zoomBy(dy / CFG.puckZoomPX, a.x, a.y);
    t.zoomRefY = t.y;
}
