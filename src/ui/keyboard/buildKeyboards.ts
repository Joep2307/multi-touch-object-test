import { cloneWithSuffix } from "../../dom/cloneWithSuffix";
import { el } from "../../dom/el";
import { keyboards } from "../../state/keyboards";
import type { KeyboardView } from "../../types/KeyboardView";
import type { Side } from "../../types/Side";
import { wireKeyboard } from "./wireKeyboard";

/* Two keyboards, one per table edge. A single keyboard at the bottom is
   unreachable and upside down for whoever stands on the other side, and as
   long as there was only one, two people had to type in turns. Each
   keyboard remembers its own field and its own shift, so they don't get in
   each other's way. */
export function buildKeyboards(): void {
    for (const side of ["a", "b"] as Side[]) {
        const suffix = side === "a" ? "" : "-b";
        const root =
            side === "a"
                ? el("keyboard")
                : cloneWithSuffix(el("keyboard"), suffix);
        if (side !== "a") document.body.appendChild(root);
        // The other side is upside down and at the top; that's fixed, not per field.
        root.classList.toggle("flipped", side === "b");
        const kb: KeyboardView = {
            side,
            suffix,
            el: root,
            target: null,
            shift: false,
        };
        keyboards.list.push(kb);
        wireKeyboard(kb);
    }
}
