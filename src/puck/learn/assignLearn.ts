import { el } from "../../dom/el";
import { learn } from "../../state/learn";
import { templates } from "../../state/templates";
import { applyShape } from "../applyShape";
import { saveTemplates } from "../saveTemplates";
import { tplName } from "../tplName";
import { renderTray } from "../tray/renderTray";
import { buildSheet } from "./buildSheet";
import { learnShape } from "./learnShape";
import { renderLearn } from "./renderLearn";
import { shapeClash } from "./shapeClash";

/* This is where the learning happens. That one puck's shape gets replaced
   -- including its size, since cut tape is never exactly 60 mm -- and is
   saved right away. If the new shape looks too much like another puck's,
   that gets flagged explicitly: the table would otherwise mix them up. */
export function assignLearn(id: string): void {
    const tpl = templates.list.find((t) => t.id === id);
    if (!tpl || !learn.m) return;
    const shape = learnShape();
    const clash = templates.list.find(
        (t) => t !== tpl && shapeClash(t, shape),
    );
    applyShape(tpl, shape);
    tpl.learnedAt = new Date().toISOString();
    saveTemplates();
    learn.tplId = id;
    learn.clash = clash ? tplName(clash) : null;
    learn.phase = "saved";
    renderLearn();
    renderTray();
    if (el("sheet").style.display === "block") buildSheet();
}
