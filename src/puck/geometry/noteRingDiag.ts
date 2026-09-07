import { diag } from "../../state/diag";
import { ui } from "../../state/ui";
import type { RingMatch } from "../../types/RingMatch";
import type { RingShape } from "../../types/RingShape";
import type { Template } from "../../types/Template";
import { view } from "../../state/view";

/* Keep the best ring match of this frame for the diagnosis overlay. */
export function noteRingDiag(
    d: RingShape,
    measured: { tpl: Template; m: RingMatch }[],
): void {
    if (!ui.debugMode || !measured.length) return;
    if (diag.ring && diag.ring.err <= measured[0].m.err) return;
    diag.ring = {
        err: measured[0].m.err,
        legs: d.angles.length,
        mm: d.radius / view.pxPerMM,
        spread: d.spread,
        list: measured.map((g) => ({ name: g.tpl.id, err: g.m.err })),
    };
}
