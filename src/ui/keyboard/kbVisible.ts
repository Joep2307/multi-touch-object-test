import type { KeyboardView } from "../../types/KeyboardView";

export const kbVisible = (kb: KeyboardView): boolean =>
    kb.el.classList.contains("visible");
