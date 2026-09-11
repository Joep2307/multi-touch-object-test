import { UI_SCALES } from "../config";
import { el } from "../dom";
import { openNotes, positionNote, positionNoteX } from "../notes";
import { readChip } from "../render";
import { ui } from "../state";
import { positionKgInfo } from "./kgInfo";
import { refreshPanelOffsets } from "./panels";

export function applyScale(): void {
    document.documentElement.style.setProperty("--ui-scale", String(ui.scale));
    el("scaleVal").textContent = Math.round(ui.scale * 100) + "%";
    const i = UI_SCALES.indexOf(ui.scale);
    el<HTMLButtonElement>("btnScaleDown").disabled = i <= 0;
    el<HTMLButtonElement>("btnScaleUp").disabled = i >= UI_SCALES.length - 1;
    readChip();
    try {
        localStorage.setItem(
            "pucktable-ui-scale-" + ui.mode,
            String(ui.scale),
        );
    } catch (e) {}
    // An open window hangs on a point on the map; that point doesn't shift
    // along, so both windows are repositioned against their anchor.
    for (const v of openNotes()) {
        positionNoteX(v);
        positionNote(v);
    }
    positionKgInfo();
    refreshPanelOffsets();
}
