import { UI_SCALES } from "../config/UI_SCALES";
import { el } from "../dom/el";
import { openNotes } from "../notes/openNotes";
import { positionNote } from "../notes/positionNote";
import { positionNoteX } from "../notes/positionNoteX";
import { readChip } from "../render/readChip";
import { ui } from "../state/ui";
import { positionKgInfo } from "./kgInfo/positionKgInfo";
import { refreshPanelOffsets } from "./panels/refreshPanelOffsets";

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
