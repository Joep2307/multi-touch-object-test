import { puckHoleAt } from "./puckHoleAt";
import { dropPin } from "./dropPin";
import { openPuckRing } from "./ring/openPuckRing";
import { pins } from "../state/pins";
import { openNote } from "../notes/openNote";

/* A center tap places the mark and opens its topic ring. The visible options
   are then selected by tapping; turning remains reserved for map zoom. */
export function tryConfirmPuck(x: number, y: number): boolean {
    const t = puckHoleAt(x, y);
    if (!t) return false;
    if (t.armed) dropPin(t);
    else {
        const pin = t.pinId
            ? pins.list.find((candidate) => candidate.id === t.pinId)
            : null;
        if (pin) openNote(pin, t.x, t.y, true);
    }
    openPuckRing(t);
    return true;
}
