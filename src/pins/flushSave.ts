import { pins } from "../state/pins";
import { save } from "./save";

/* What was typed is already in the marker, but the save may still be
   pending (see saveSoon). Finish that first. */
export function flushSave(): void {
    if (pins.saveTimer) {
        clearTimeout(pins.saveTimer);
        pins.saveTimer = null;
        save();
    }
}
