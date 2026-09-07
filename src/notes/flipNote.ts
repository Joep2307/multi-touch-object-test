import { save } from "../pins/save";
import type { Pin } from "../types/Pin";
import { sidesActive } from "../ui/sidesActive";
import { flipFor } from "./flipFor";
import { noteViewFor } from "./noteViewFor";
import { openNote } from "./openNote";

/* Switching sides now means moving: each side has its own window, so the
   marker moves to the window on the far side (with its own keyboard). An
   ongoing recording keeps running -- it's the same marker. */
export function flipNote(
    pin: Pin | null | undefined,
    x?: number,
    y?: number,
): void {
    if (!pin || !sidesActive()) return;
    const v = noteViewFor(pin);
    const ax = v
        ? +(v.el.dataset.anchorX ?? 0) || innerWidth / 2
        : (x ?? innerWidth / 2);
    const ay = v
        ? +(v.el.dataset.anchorY ?? 0) || innerHeight / 2
        : (y ?? innerHeight / 2);
    pin.flip = !flipFor(pin, ay);
    save();
    openNote(pin, ax, ay, true);
}
