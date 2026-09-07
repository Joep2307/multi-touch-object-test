import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { reset } from "../../state/reset";
import { keyLabel } from "./keyLabel";

export function applyResetKey(): void {
    const b = el("btnResetKey");
    b.classList.toggle("on", reset.learning);
    b.textContent = reset.learning ? tr("resetKeyWaiting") : tr("resetKey");
    el("resetKeyHint").innerHTML = reset.key
        ? tr("resetKeyNow", keyLabel(reset.key))
        : tr("resetKeyNone");
}
