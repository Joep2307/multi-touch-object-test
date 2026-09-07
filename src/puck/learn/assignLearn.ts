import { el } from "../../dom/el";
import { vName } from "../../i18n/vName";
import { learn } from "../../state/learn";
import { templates } from "../../state/templates";
import { view } from "../../state/view";
import { saveTemplates } from "../saveTemplates";
import { renderTray } from "../tray/renderTray";
import { buildSheet } from "./buildSheet";
import { renderLearn } from "./renderLearn";

/* This is where the learning happens. That one puck's triangle gets replaced —
   including its size, since cut tape is never exactly 60 mm — and is saved
   right away. If the new triangle looks too much like another puck's, that
   gets flagged explicitly: the table would otherwise mix them up later. */
export function assignLearn(id: string): void {
    const tpl = templates.list.find((t) => t.id === id);
    if (!tpl || !learn.m) return;
    const r: [number, number] = [
        +learn.m.r0.toFixed(3),
        +learn.m.r1.toFixed(3),
    ];
    const clash = templates.list.find(
        (t) =>
            t !== tpl &&
            Math.hypot(t.ratios[0] - r[0], t.ratios[1] - r[1]) < 0.12,
    );
    tpl.ratios = r;
    tpl.longestMM = +(learn.m.longest / view.pxPerMM).toFixed(1);
    tpl.learnedAt = new Date().toISOString();
    saveTemplates();
    learn.tplId = id;
    learn.clash = clash ? vName(clash.verdict) : null;
    learn.phase = "saved";
    renderLearn();
    renderTray();
    if (el("sheet").style.display === "block") buildSheet();
}
