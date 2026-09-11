import { noteViewOf } from "../../notes";
import { ui } from "../../state";
import { kbVisible } from "./kbVisible";
import type { KeyboardView } from "../../types";

/* Keep the window being typed in above its own keyboard. */
export function liftEditorAboveKeyboard(
    kb: KeyboardView | null | undefined,
): void {
    const v = kb?.target ? noteViewOf(kb.target) : null;
    if (!kb || !v || !v.pin || !kbVisible(kb)) return;
    const n = v.el;
    const nr = n.getBoundingClientRect(),
        kr = kb.el.getBoundingClientRect();
    const flip = v.flip;
    // The keyboard is on the same side as the person: at the bottom for
    // whoever stands in front, at the top for whoever stands on the other
    // side. So the window moves out of the way to the opposite side.
    let top: number | null = null;
    if (flip && nr.top < kr.bottom + 12)
        top = Math.min(innerHeight - nr.height - 12, kr.bottom + 12);
    else if (!flip && nr.bottom > kr.top - 12)
        top = Math.max(12, kr.top - nr.height - 12);
    if (top === null) return;
    n.style.top = Math.max(12, top) / ui.scale + "px";
}
