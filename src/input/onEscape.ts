import { el } from "../dom/el";
import { closeNote } from "../notes/closeNote";
import { openNotes } from "../notes/openNotes";
import { closeLearn } from "../puck/learn/closeLearn";
import { closeSheet } from "../puck/learn/closeSheet";
import { learn } from "../state/learn";
import { menu } from "../state/menu";
import { closeAnalytics } from "../ui/analytics/closeAnalytics";
import { closeDocumentViewer } from "../ui/kgInfo/closeDocumentViewer";
import { closeKgInfo } from "../ui/kgInfo/closeKgInfo";
import { closeMenu } from "../ui/menu/closeMenu";

/* Escape closes the topmost window: with two open, only one should disappear at a time. */
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
