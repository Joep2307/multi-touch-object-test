import { CFG } from "../../config/CFG";
import type { RingShape } from "../../types/RingShape";
import type { ShapeValue } from "../../types/ShapeValue";
import type { Template } from "../../types/Template";
import { gapsOf } from "../geometry/gapsOf";
import { isRing } from "../geometry/isRing";
import { matchRing } from "../geometry/matchRing";

/* Does this measurement look too much like a puck that already exists? For
   rings that is about the gaps between the feet, for triangles about the
   side ratios -- and a ring never resembles a triangle. */
export function shapeClash(t: Template, shape: ShapeValue): boolean {
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
