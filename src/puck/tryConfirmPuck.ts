import { openNote } from "../notes";
import { pins } from "../state";
import { dropPin } from "./dropPin";
import { puckHoleAt } from "./puckHoleAt";
import { openPuckRing } from "./ring";

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
