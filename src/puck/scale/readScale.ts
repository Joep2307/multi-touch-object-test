import { SCALE } from "../../config/SCALE";
import type { PuckShape } from "../../types/PuckShape";
import type { ScaleReading } from "../../types/ScaleReading";
import type { Template } from "../../types/Template";
import { tplLongest } from "../tplLongest";
import { tplRing } from "../geometry/tplRing";

/* What this puck says about the screen, or nothing if it may not say it.

   A template that was learned at the table is disqualified: its
   millimetres were computed from `view.pxPerMM` in the first place, so a
   reading from it would only confirm whatever the scale already is.
   `learnedAt` marks a puck read in through the measuring sheet, `duoSeen`
   one the duo bootstrap measured on the spot; both mean "measured here"
   and neither can serve as a ruler. */
export function readScale(
    tpl: Template,
    d: PuckShape,
    conf: number,
): ScaleReading | null {
    if (tpl.learnedAt || tpl.duoSeen === true) return null;
    const px = d.ring ? d.radius : d.longest,
        mm = d.ring ? tplRing(tpl) : tplLongest(tpl);
    if (!Number.isFinite(px) || !Number.isFinite(mm)) return null;
    if (px <= 0 || mm < SCALE.minMM) return null;
    return { px, mm, conf };
}
