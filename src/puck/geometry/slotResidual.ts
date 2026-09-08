import { slotWidth } from "./slotWidth";

/* How far this foot sits from the middle of its slot, in degrees, signed
   and never more than half a slot. */
export function slotResidual(
    angle: number,
    phase: number,
    slots: number,
): number {
    const w = slotWidth(slots);
    const rel = angle - phase;
    return rel - Math.round(rel / w) * w;
}
