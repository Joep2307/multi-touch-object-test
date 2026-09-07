import type { KeyboardView } from "../../types/KeyboardView";

export const kbPart = <T extends HTMLElement = HTMLElement>(
    kb: KeyboardView,
    id: string,
): T => document.getElementById(id + kb.suffix) as T;
