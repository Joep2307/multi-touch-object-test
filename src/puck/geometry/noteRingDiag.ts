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
    if (!ui.debugMode) return;
    const first = measured[0];
    if (!first) return;
    if (diag.ring && diag.ring.err <= first.m.err) return;
    diag.ring = {
        err: first.m.err,
        legs: d.angles.length,
        mm: d.radius / view.pxPerMM,
        spread: d.spread,
        list: measured.map((g) => ({ name: g.tpl.id, err: g.m.err })),
    };
}
