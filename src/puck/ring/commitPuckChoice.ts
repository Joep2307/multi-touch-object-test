import { MV } from "../../map/MV";
import type { Track } from "../../types/Track";
import { syncPlacedPinTopic } from "../syncPlacedPinTopic";
import { ringIndexOf } from "./ringIndexOf";
import { ringItems } from "./ringItems";

/* Carry out a choice from the ring. Only here does a puck's mode change,
   so there's a single place to read what each option does. */
export function commitPuckChoice(t: Track, idx: number): void {
    const items = ringItems(t),
        item = items[idx];
    if (!item || item.disabled) return;
    if (item.key === "topic") {
        t.topicIdx = idx;
        syncPlacedPinTopic(t);
    } else if (item.key === "back") {
        if (t.menu === "topics") t.menu = "root";
    } else if (item.key === "select") {
        t.menu = "topics";
    } else if (item.key === "move") {
        t.mode = "move";
        t.zoomAnchor = null;
    } else if (item.key === "zoom") {
        // The anchor point is set here, at the location that currently lies
        // under the crosshair. See applyPuckZoom.
        t.mode = "zoom";
        t.zoomRefY = t.y;
        t.zoomAnchor = MV.unproject(t.x, t.y);
    }
    // After jumping to a different level, the same angle points to a different
    // option. That counts as "already seen", otherwise the next level fires
    // immediately.
    t.dwellIdx = ringIndexOf(t.angle, ringItems(t).length);
    t.dwellDone = true;
}
