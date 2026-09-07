import type { RingMatch } from "../../types/RingMatch";
import type { RingShape } from "../../types/RingShape";
import type { Template } from "../../types/Template";
import { gapErr } from "./gapErr";
import { gapsOf } from "./gapsOf";
import { norm360 } from "./norm360";
import { shiftGaps } from "./shiftGaps";

/* Does this measurement fit this template? The gaps lie in a ring, so which
   foot is "the first" only depends on how the puck happens to lie: all
   shifts are tried. The best one immediately says which measured point
   belongs to which foot -- and with that the puck's angle, as the average
   of five differences. That is far steadier than one corner of a triangle,
   because noise on a single foot now weighs only a fifth.

   Four measured points are allowed too. A foot that misses contact for one
   frame is the rule rather than the exception at this table -- a contact
   area of 2 mm is small. Then one foot of the template is left out in turn
   and we see which omission fits; the gaps of the remaining four work
   themselves out. With five points there is nothing to leave out and this
   is exactly the old sum. */
export function matchRing(d: RingShape, tpl: Template): RingMatch {
    const ta = [...(tpl.angles ?? [])].map(norm360).sort((a, b) => a - b);
    const k = d.angles.length;
    const drop = k === 5 ? [-1] : ta.map((_, i) => i);
    let best: { err: number; sub: number[]; s: number } | null = null;
    for (const w of drop) {
        const sub = w < 0 ? ta : ta.filter((_, i) => i !== w);
        const sg = gapsOf(sub);
        for (let s = 0; s < k; s++) {
            const err = gapErr(d.gaps, shiftGaps(sg, s));
            if (!best || err < best.err) best = { err, sub, s };
        }
    }
    if (!best) return { err: Infinity, angle: 0, legs: k };
    let cs = 0,
        sn = 0;
    for (let i = 0; i < k; i++) {
        const off =
            ((d.angles[i] - best.sub[(i + best.s) % k]) * Math.PI) / 180;
        cs += Math.cos(off);
        sn += Math.sin(off);
    }
    /* Angle 0 of a template is its direction arrow, so this is the way the
     puck points. */
    return { err: best.err, angle: Math.atan2(sn, cs), legs: k };
}
