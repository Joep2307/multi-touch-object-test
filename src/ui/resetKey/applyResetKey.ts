import { el } from "../../dom";
import { tr } from "../../i18n";
import { reset } from "../../state";
import { keyLabel } from "./keyLabel";

export function applyResetKey(): void {
    const b = el("btnResetKey");
    b.classList.toggle("on", reset.learning);
    b.textContent = reset.learning ? tr("resetKeyWaiting") : tr("resetKey");
    el("resetKeyHint").innerHTML = reset.key
        ? tr("resetKeyNow", keyLabel(reset.key))
        : tr("resetKeyNone");
}
