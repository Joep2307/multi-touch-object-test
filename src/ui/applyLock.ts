import { el } from "../dom";
import { tr } from "../i18n";
import { ui } from "../state";

export function applyLock(): void {
    el("btnMove").classList.toggle("on", ui.mapLocked);
    el("btnMove").textContent = ui.mapLocked ? tr("locked") : tr("move");
}
