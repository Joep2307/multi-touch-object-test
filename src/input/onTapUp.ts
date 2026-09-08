import { MV } from "../map/MV";
import { kgAt } from "../kg/kgAt";
import { closeNotes } from "../notes/closeNotes";
import { flipNote } from "../notes/flipNote";
import { openNote } from "../notes/openNote";
import { doubleTap } from "../pins/doubleTap";
import { puckTrackAt } from "../puck/puckTrackAt";
import { clearPucks } from "../puck/sim/clearPucks";
import { simPuckAt } from "../puck/sim/simPuckAt";
import { tryConfirmPuck } from "../puck/tryConfirmPuck";
import { tryPuckMenuTap } from "../puck/ring/tryPuckMenuTap";
import { pins } from "../state/pins";
import { touches } from "../state/touches";
import { closeKgInfo } from "../ui/kgInfo/closeKgInfo";
import { openKgInfo } from "../ui/kgInfo/openKgInfo";

/* A short tap on the map: confirm a placement, open a window, tap a graph
   node, or clear the drag copies. */
export function onTapUp(e: PointerEvent): void {
    const ts = touches.tapStart;
    if (!ts) return;
    const quick =
        performance.now() - ts.t < 350 &&
        Math.hypot(e.clientX - ts.x, e.clientY - ts.y) < 12;
    touches.tapStart = null;
    if (!quick) return;
    // A tap in the viewfinder confirms the placement; that takes priority
    // over everything else, since it's the only action that puts something
    // new on the map.
    if (tryConfirmPuck(e.clientX, e.clientY)) return;
    // The visible option ring belongs to the puck, not to the map below it.
    if (tryPuckMenuTap(e.clientX, e.clientY)) return;
    // A tap that lands on a puck (simulated or detected) belongs to that puck.
    const onTrack = puckTrackAt(e.clientX, e.clientY);
    if (onTrack) {
        /* A puck that's already locked in place: tapping reopens its window,
       double-tapping flips it to the other side. The former used to be
       missing -- anyone who had closed their window couldn't get back to it
       without lifting the puck. */
        const own = onTrack.pinId
            ? pins.list.find((p) => p.id === onTrack.pinId)
            : null;
        if (own) {
            if (doubleTap(own.id)) flipNote(own, onTrack.x, onTrack.y);
            else openNote(own, onTrack.x, onTrack.y, true);
        }
        return;
    }
    if (simPuckAt(e.clientX, e.clientY)) return;
    const hit = [...pins.list].reverse().find((p) => {
        const s = MV.project(p.lng, p.lat);
        return Math.hypot(s.x - e.clientX, s.y - e.clientY) < 24;
    });
    if (hit) {
        closeKgInfo();
        if (doubleTap(hit.id)) flipNote(hit, e.clientX, e.clientY);
        else openNote(hit, e.clientX, e.clientY);
        return;
    }
    // No own placement hit? Then the knowledge graph may have the tap.
    const node = kgAt(e.clientX, e.clientY);
    if (node) {
        closeNotes();
        openKgInfo(node, e.clientX, e.clientY);
        return;
    }
    // An empty patch of table is map control and does not close any open
    // panels. The user closes those deliberately with their close button or
    // with Escape.
    clearPucks(false);
}
