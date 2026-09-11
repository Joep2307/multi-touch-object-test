import { notePart, noteViewOf } from "../../notes";
import { hideKeyboard } from "./hideKeyboard";
import { insertKeyboardText } from "./insertKeyboardText";
import { renderKeyboard } from "./renderKeyboard";
import type { KeyboardView } from "../../types";

export function wireKeyboard(kb: KeyboardView): void {
    kb.el.addEventListener("pointerdown", (e) => {
        if ((e.target as Element).closest("button")) e.preventDefault();
    });
    kb.el.addEventListener("click", (e) => {
        const button = (e.target as Element).closest<HTMLElement>(
            "button[data-key]",
        );
        if (!button || !kb.target) return;
        const key = button.dataset.key as string;
        if (key === "shift") {
            kb.shift = !kb.shift;
            renderKeyboard(kb);
            return;
        }
        if (key === "close") {
            hideKeyboard(kb, true);
            return;
        }
        if (key === "backspace") {
            const target = kb.target,
                start = target.selectionStart ?? target.value.length,
                end = target.selectionEnd ?? start;
            if (start !== end) target.setRangeText("", start, end, "end");
            else if (start > 0)
                target.setRangeText("", start - 1, start, "end");
            target.dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }
        if (key === "enter") {
            const v = noteViewOf(kb.target);
            if (kb.target.tagName === "TEXTAREA") insertKeyboardText(kb, "\n");
            else if (v && kb.target === notePart(v, "noteTitle")) {
                notePart(v, "noteText").focus();
            } else {
                kb.target.dispatchEvent(
                    new KeyboardEvent("keydown", {
                        key: "Enter",
                        bubbles: true,
                    }),
                );
                kb.target.dispatchEvent(
                    new Event("change", { bubbles: true }),
                );
                hideKeyboard(kb, true);
            }
            return;
        }
        insertKeyboardText(
            kb,
            key === "space" ? " " : kb.shift ? key.toUpperCase() : key,
        );
        if (kb.shift) {
            kb.shift = false;
            renderKeyboard(kb);
        }
    });
}
