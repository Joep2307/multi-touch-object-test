import type { KeyboardView } from "../../types";

export const kbVisible = (kb: KeyboardView): boolean =>
    kb.el.classList.contains("visible");
