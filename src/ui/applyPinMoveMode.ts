import { el } from "../dom";
import { tr } from "../i18n";
import { touches, ui } from "../state";

export function applyPinMoveMode(): void {
    el("btnMoveDots").classList.toggle("on", ui.pinMoveMode);
    el("btnMoveDots").textContent = ui.pinMoveMode
        ? tr("movingDots")
        : tr("moveDots");
    document.body.classList.toggle("moving-dots", ui.pinMoveMode);
    if (!ui.pinMoveMode) {
        touches.pinDrag = null;
        document.body.classList.remove("dragging-dot");
    }
    touches.gesture = null;
    touches.mousePan = null;
}
