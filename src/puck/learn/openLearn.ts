import { el } from "../../dom/el";
import { learn } from "../../state/learn";
import { closeMenu } from "../../ui/menu/closeMenu";
import { restartLearn } from "./restartLearn";

/* ── Recognizing a puck ────────────────────────────────────────────────────
   Three pieces of copper foil in a triangle make a puck; which puck it is
   can't be read off the tape anywhere. This panel measures the triangle
   lying on the table and then lets you give it a name — Good, Problem,
   Discussion, Idea. The measurement overwrites that one puck's triangle and
   is kept in localStorage, so this screen still knows it after a reload.
   A fifth puck is never added: the number of pucks is a design choice, not
   a measurement result. */
export function openLearn(): void {
    closeMenu();
    learn.open = true;
    el("learn").style.display = "block";
    restartLearn();
}
