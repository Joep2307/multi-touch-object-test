import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { touches } from "../state/touches";
import { ui } from "../state/ui";

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
