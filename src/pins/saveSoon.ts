import { pins } from "../state";
import { save } from "./save";

/* While typing, not every keystroke needs to go to storage. */
export function saveSoon(): void {
    if (pins.saveTimer) clearTimeout(pins.saveTimer);
    pins.saveTimer = setTimeout(save, 400);
}
