import { el } from "../dom";
import { tr } from "../i18n";
import { wipe } from "../state";

export function resetWipeButton(): void {
    wipe.armedAt = 0;
    el("btnWipe").classList.remove("on");
    el("btnWipe").textContent = tr("wipe");
}
