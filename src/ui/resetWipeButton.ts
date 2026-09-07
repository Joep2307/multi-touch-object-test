import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { wipe } from "../state/wipe";

export function resetWipeButton(): void {
    wipe.armedAt = 0;
    el("btnWipe").classList.remove("on");
    el("btnWipe").textContent = tr("wipe");
}
