import { keyboards } from "../../state";
import { hideKeyboard } from "./hideKeyboard";

/* Everything that was being typed in this piece of screen is gone; the
   associated keyboard should disappear along with it. */
export function hideKeyboardIn(root: HTMLElement | null): void {
    if (!root) return;
    for (const kb of keyboards.list)
        if (kb.target && root.contains(kb.target)) hideKeyboard(kb, true);
}
