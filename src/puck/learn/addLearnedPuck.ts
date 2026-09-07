import { VERDICTS } from "../../config/VERDICTS";
import { el } from "../../dom/el";
import { vName } from "../../i18n/vName";
import { learn } from "../../state/learn";
import { templates } from "../../state/templates";
import { view } from "../../state/view";
import type { Verdict } from "../../types/Verdict";
import { addOwnPuck } from "../addOwnPuck";
import { buildSheet } from "./buildSheet";
import { renderLearn } from "./renderLearn";

/* Puck mode has no fixed four: every measurement is added as a new puck.
   If the triangle looks too much like a puck you already have, that gets
   flagged -- the table would otherwise mix those two up later. */
export function addLearnedPuck(verdict: Verdict): void {
    if (!learn.m || !VERDICTS.some((v) => v.key === verdict)) return;
    const r: [number, number] = [
        +learn.m.r0.toFixed(3),
        +learn.m.r1.toFixed(3),
    ];
    const clash = templates.own.find(
        (t) => Math.hypot(t.ratios[0] - r[0], t.ratios[1] - r[1]) < 0.12,
    );
    const p = addOwnPuck(
        verdict,
        r,
        +(learn.m.longest / view.pxPerMM).toFixed(1),
    );
    learn.tplId = p.id;
    learn.clash = clash ? vName(clash.verdict) : null;
    learn.phase = "saved";
    renderLearn();
    if (el("sheet").style.display === "block") buildSheet();
}
