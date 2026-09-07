import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { ui } from "../state/ui";

export function applyLock(): void {
    el("btnMove").classList.toggle("on", ui.mapLocked);
    el("btnMove").textContent = ui.mapLocked ? tr("locked") : tr("move");
}
