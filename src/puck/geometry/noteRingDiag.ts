import { diag, ui, view } from "../../state";
import type { RingMatch, RingShape, Template } from "../../types";

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
