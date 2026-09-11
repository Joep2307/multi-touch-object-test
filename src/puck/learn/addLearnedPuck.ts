import { VERDICTS } from "../../config";
import { el } from "../../dom";
import { vName } from "../../i18n";
import { learn, templates } from "../../state";
import { addOwnPuck } from "../addOwnPuck";
import { buildSheet } from "./buildSheet";
import { learnShape } from "./learnShape";
import { renderLearn } from "./renderLearn";
import { shapeClash } from "./shapeClash";
import type { Verdict } from "../../types";

/* Puck mode has no fixed four: every measurement is added as a new puck.
   If the shape looks too much like a puck you already have, that gets
   flagged -- the table would otherwise mix those two up later. */
export function addLearnedPuck(verdict: Verdict): void {
    if (!learn.m || !VERDICTS.some((v) => v.key === verdict)) return;
    const shape = learnShape();
    const clash = templates.own.find((t) => shapeClash(t, shape));
    const p = addOwnPuck(verdict, shape);
    if (!p) return;
    learn.tplId = p.id;
    learn.clash = clash ? vName(clash.verdict) : null;
    learn.phase = "saved";
    renderLearn();
    if (el("sheet").style.display === "block") buildSheet();
}
