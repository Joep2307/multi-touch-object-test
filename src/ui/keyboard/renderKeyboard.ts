import { KEY_ROWS } from "../../config/KEY_ROWS";
import { keyboards } from "../../state/keyboards";
import type { KeyboardView } from "../../types/KeyboardView";
import { kbPart } from "./kbPart";
import { keyboardLabel } from "./keyboardLabel";

/* Without an argument: all keyboards (on a language switch). */
export function renderKeyboard(kb?: KeyboardView): void {
    if (!kb) {
        for (const k of keyboards.list) renderKeyboard(k);
        return;
    }
    kbPart(kb, "keyboardKeys").innerHTML = KEY_ROWS.map(
        (row) =>
            `<div class="keyboard-row">${row
                .map((key) => {
                    const wide = [
                        "shift",
                        "backspace",
                        "enter",
                        "close",
                    ].includes(key)
                        ? " key-wide"
                        : "";
                    const space = key === "space" ? " key-space" : "";
                    const active =
                        key === "shift" && kb.shift ? " key-active" : "";
                    const label =
                        /^[a-z]$/.test(key) && kb.shift
                            ? key.toUpperCase()
                            : keyboardLabel(key);
                    return `<button type="button" class="${wide}${space}${active}" data-key="${key}">${label}</button>`;
                })
                .join("")}</div>`,
    ).join("");
}
