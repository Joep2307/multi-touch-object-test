import { reset } from "../../state";
import { applyResetKey } from "./applyResetKey";
import { setResetKey } from "./setResetKey";

/* Hold down, not tap. Someone leaning against the table edge or brushing
   past the button would otherwise discard half a conversation; now a ring
   fills up first, and releasing is enough to change your mind. */
export function onResetKeydown(e: KeyboardEvent): void {
    if (reset.learning) {
        e.preventDefault();
        if (e.code === "Escape") {
            reset.learning = false;
            applyResetKey();
            return;
        }
        setResetKey(e.code);
        return;
    }
    if (!reset.key || e.code !== reset.key || e.repeat) return;
    // A key that sends an ordinary typing character must not trigger while
    // someone is writing a contribution. Function keys are always the button.
    const t = e.target as HTMLElement | null;
    if (
        !/^F\d+$/.test(e.code) &&
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA")
    )
        return;
    e.preventDefault();
    if (!reset.heldAt) reset.heldAt = performance.now();
}
