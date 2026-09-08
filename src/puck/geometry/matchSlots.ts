import type { SlotMatch } from "../../types/SlotMatch";
import type { SlotShape } from "../../types/SlotShape";
import type { Template } from "../../types/Template";
import { popCount } from "./popCount";
import { rotateCode } from "./rotateCode";
import { slotWidth } from "./slotWidth";
import { tplSlots } from "./tplSlots";

/* Does this measurement fit this template? Which slot is "the first" only
   depends on how the puck happens to lie, so all turns are tried and the
   one that differs in the fewest slots wins. Two ways to differ: a foot the
   template has and the glass doesn't (`miss` -- a foot that briefly loses
   contact) and one the glass has and the template doesn't (`extra` -- a
   finger resting on the same circle). Both count as one.

   The turn gives the direction to within a slot; the angle itself is then
   read from all the matched feet at once, as the circular mean of their
   differences with the drawing. That is far steadier than one corner of a
   triangle: noise on a single foot weighs only a sixth. */
export function matchSlots(d: SlotShape, tpl: Template): SlotMatch {
    const n = d.slots,
        w = slotWidth(n),
        mask = (1 << n) - 1;
    const code = (tpl.code ?? 0) & mask;
    if (!code || tplSlots(tpl) !== n)
        return { err: Infinity, miss: n, extra: n, rot: 0, angle: 0 };
    let best = { err: Infinity, miss: n, extra: n, rot: 0 };
    for (let k = 0; k < n; k++) {
        const r = rotateCode(code, n, k);
        const miss = popCount(r & ~d.code & mask);
        const extra = popCount(d.code & ~r & mask);
        if (miss + extra < best.err)
            best = { err: miss + extra, miss, extra, rot: k };
    }
    let cs = 0,
        sn = 0,
        used = 0;
    for (let i = 0; i < d.angles.length; i++) {
        const j = (((d.idx[i] - best.rot) % n) + n) % n;
        /* A stray point has no foot on the drawing; it must not drag the
         angle along. */
        if (!((code >>> j) & 1)) continue;
        const off = ((d.angles[i] - j * w) * Math.PI) / 180;
        cs += Math.cos(off);
        sn += Math.sin(off);
        used++;
    }
    return { ...best, angle: used ? Math.atan2(sn, cs) : 0 };
}
