import { openNote } from "../notes/openNote";
import { pins } from "../state/pins";
import { dropPin } from "./dropPin";
import { puckHoleAt } from "./puckHoleAt";

/* A tap or click at the puck's center places the marker. The center is the
   viewing hole, and that's exactly the point that gets stored as the
   coordinate: so you're pointing at what you're placing. The band around it
   still belongs to dragging and rotating, and the ring around that to the
   menu, so placing a marker doesn't collide with either. */
export function tryConfirmPuck(x: number, y: number): boolean {
    const t = puckHoleAt(x, y);
    if (!t) return false;
    if (t.armed) {
        dropPin(t);
        return true;
    }
    /* Already placed? Then a tap in the viewing hole means "show what's here":
     this puck's panel comes back. Without this, the only way to get back a
     panel you'd closed yourself was to lift the puck and put it down again
     -- and that would count as a new contribution. */
    const pin = t.pinId ? pins.list.find((p) => p.id === t.pinId) : null;
    if (!pin) return false;
    openNote(pin, t.x, t.y, true);
    return true;
}
