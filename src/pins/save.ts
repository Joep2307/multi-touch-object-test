import { el } from "../dom";
import { pins } from "../state";

/* Saving used to be `try{...}catch(e){}` — a full browser storage quota made
   the save vanish without a trace, and that's exactly what happens the
   moment someone saves the map offline (that used to live in the same
   5 MB; see bakeMap, which now uses IndexedDB). You only noticed it after
   the reload, and by then the afternoon's work was gone. */
export function save(): void {
    pins.revision++;
    try {
        localStorage.setItem(
            "pucktable-" + el<HTMLInputElement>("sess").value,
            JSON.stringify(pins.list),
        );
        pins.storageFull = false;
    } catch (e) {
        pins.storageFull = true;
    }
}
