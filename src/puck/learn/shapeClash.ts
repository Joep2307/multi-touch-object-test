import { CFG } from "../../config/CFG";
import type { RingShape } from "../../types/RingShape";
import type { ShapeValue } from "../../types/ShapeValue";
import type { Template } from "../../types/Template";
import { codeDistance } from "../geometry/codeDistance";
import { gapsOf } from "../geometry/gapsOf";
import { isRing } from "../geometry/isRing";
import { isSlotted } from "../geometry/isSlotted";
import { matchRing } from "../geometry/matchRing";
import { tplRing } from "../geometry/tplRing";
import { tplSlots } from "../geometry/tplSlots";

/* Does this measurement look too much like a puck that already exists? For
   rings that is about the gaps between the feet, for triangles about the
   side ratios, for grid codes about how many slots differ -- and the three
   shapes never resemble each other.

   A grid code only clashes if the ring is the same size too: the same
   pattern on 26 mm is deliberately a different puck. Four slots apart is
   what the printed codes have, and that is exactly enough for one missing
   foot plus one stray finger; anything closer gets flagged. */
export function shapeClash(t: Template, shape: ShapeValue): boolean {
    const slot =
        Number.isFinite(shape.slots) &&
        Number.isFinite(shape.code) &&
        (shape.code as number) > 0;
    if (isSlotted(t) !== slot) return false;
    if (slot) {
        const n = shape.slots as number;
        if (tplSlots(t) !== n) return false;
        const mm = shape.ringMM;
        if (
            Number.isFinite(mm) &&
            Math.abs(tplRing(t) - (mm as number)) / tplRing(t) > 0.18
        )
            return false;
        return codeDistance(t.code ?? 0, shape.code as number, n) < 4;
    }
    if (isRing(t) !== !!shape.angles) return false;
    if (shape.angles) {
        const a = [...shape.angles].sort((x, y) => x - y);
        const d = {
            ring: true,
            cx: 0,
            cy: 0,
            radius: 0,
            spread: 0,
            angles: a,
            gaps: gapsOf(a),
        } as RingShape;
        return matchRing(d, t).err < CFG.ringToleranceDeg * 1.5;
    }
    const r = t.ratios ?? [0, 0],
        s = shape.ratios ?? [0, 0];
    return Math.hypot(r[0] - s[0], r[1] - s[1]) < 0.12;
}
