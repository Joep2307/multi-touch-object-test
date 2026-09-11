import { keyboards } from "../../state";
import { kbVisible } from "./kbVisible";
import type { KeyboardView } from "../../types";

export function hideKeyboard(
    kb: KeyboardView | null | undefined,
    blur = false,
): void {
    if (!kb) return;
    kb.el.classList.remove("visible");
    if (blur && kb.target) kb.target.blur();
    kb.target = null;
    kb.shift = false;
    document.body.classList.toggle(
        "keyboard-open",
        keyboards.list.some(kbVisible),
    );
}
