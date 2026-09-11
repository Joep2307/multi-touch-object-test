import { el } from "../dom";
import { closeNote, openNotes } from "../notes";
import { closeLearn, closeSheet } from "../puck/learn";
import { learn, menu } from "../state";
import { closeAnalytics } from "../ui/analytics";
import { closeDocumentViewer, closeKgInfo } from "../ui/kgInfo";
import { closeMenu } from "../ui/menu";

/* Escape closes the topmost window: with two open, only one should disappear
   at a time. */
export function onEscape(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    if (el("documentViewer").classList.contains("open")) {
        closeDocumentViewer();
        return;
    }
    if (el("analytics").classList.contains("open")) {
        closeAnalytics();
        return;
    }
    if (learn.open) {
        closeLearn();
        return;
    }
    if (el("sheet").style.display === "block") {
        closeSheet();
        return;
    }
    if (menu.side) {
        closeMenu();
        return;
    }
    if (openNotes().length) {
        closeNote(openNotes().pop());
        return;
    }
    closeKgInfo();
}
