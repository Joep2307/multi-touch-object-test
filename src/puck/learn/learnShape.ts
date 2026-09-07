import { learn } from "../../state/learn";
import { view } from "../../state/view";
import type { ShapeValue } from "../../types/ShapeValue";

/* The measurement as it goes into a template. */
export function learnShape(): ShapeValue {
    const m = learn.m;
    if (!m || m.duo) return {};
    return m.ring
        ? {
              angles: m.angles.map((a) => +a.toFixed(1)),
              ringMM: +(m.radius / view.pxPerMM).toFixed(1),
          }
        : {
              ratios: [+m.r0.toFixed(3), +m.r1.toFixed(3)],
              longestMM: +(m.longest / view.pxPerMM).toFixed(1),
          };
}
