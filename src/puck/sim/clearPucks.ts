import { sim } from "../../state/sim";
import { touches } from "../../state/touches";
import { tracks } from "../../state/tracks";
import { markTray } from "../tray/markTray";

/* Deselecting: take every puck off the table and forget the live tracks.
   Marks that were already dropped stay on the map — only the selection goes.

   `dropTracks` is on by default, but not for a tap on the map: that should
   only clear the drag copies and nothing else. A physical puck is still
   sitting there; clearing its track would reset its menu, topic, and marker
   to zero even though nobody touched it. */
export function clearPucks(dropTracks = true): void {
    if (sim.pucks.length === 0 && (!dropTracks || tracks.map.size === 0))
        return;
    sim.pucks.length = 0;
    touches.puckTouches.length = 0;
    touches.drag = null;
    if (dropTracks) {
        tracks.map.clear();
        tracks.memory.length = 0;
    }
    markTray();
}
