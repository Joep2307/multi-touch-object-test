import { slotWidth } from "./slotWidth";

/* Which slot this foot falls into, counted from the start of the grid. */
export function slotOf(angle: number, phase: number, slots: number): number {
    const k = Math.round((angle - phase) / slotWidth(slots));
    return ((k % slots) + slots) % slots;
}
