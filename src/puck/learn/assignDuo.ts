import { el } from "../../dom/el";
import { learn } from "../../state/learn";
import { templates } from "../../state/templates";
import { view } from "../../state/view";
import type { TriMeasure } from "../../types/TriMeasure";
import { applyShape } from "../applyShape";
import { isToolPuck } from "../isToolPuck";
import { saveTemplates } from "../saveTemplates";
import { renderTray } from "../tray/renderTray";
import { buildSheet } from "./buildSheet";
import { renderLearn } from "./renderLearn";

/* The duo is saved in one go: two triangles from the same measurement, with
   the same date. Learning them separately is possible too -- put one half
   on the glass and pick it from the list -- but together is one action and
   saves the question of which half you were holding. */
export function assignDuo(): void {
    const m = learn.m;
    if (!m?.duo) return;
    const outer = templates.list.find((t) => t.nest && !isToolPuck(t));
    const inner = templates.list.find((t) => t.nest && isToolPuck(t));
    if (!outer || !inner) return;
    const shape = (x: Omit<TriMeasure, "ring" | "duo">) => ({
        ratios: [+x.r0.toFixed(3), +x.r1.toFixed(3)] as [number, number],
        longestMM: +(x.longest / view.pxPerMM).toFixed(1),
    });
    applyShape(outer, shape(m.o));
    applyShape(inner, shape(m.i));
    const now = new Date().toISOString();
    outer.learnedAt = now;
    inner.learnedAt = now;
    saveTemplates();
    learn.tplId = outer.id;
    learn.clash = null;
    learn.duoSaved = true;
    learn.phase = "saved";
    renderLearn();
    renderTray();
    if (el("sheet").style.display === "block") buildSheet();
}
