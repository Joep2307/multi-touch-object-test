import type { KeyboardView } from "../../types/KeyboardView";

export function insertKeyboardText(
    kb: KeyboardView | null | undefined,
    text: string,
): void {
    const target = kb?.target;
    if (!target) return;
    const start = target.selectionStart ?? target.value.length,
        end = target.selectionEnd ?? start;
    target.setRangeText(text, start, end, "end");
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.focus({ preventScroll: true });
}
