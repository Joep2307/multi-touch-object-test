import { el } from "../dom/el";
import { resize } from "../map/resize";
import { closeNotes } from "../notes/closeNotes";
import { refreshNoteFlipLabels } from "../notes/refreshNoteFlipLabels";
import { clearPucks } from "../puck/sim/clearPucks";
import { ui } from "../state/ui";
import type { UiMode } from "../types/UiMode";
import { applyScale } from "./applyScale";
import { applySides } from "./applySides";
import { hideKeyboards } from "./keyboard/hideKeyboards";
import { refreshKeyboardFields } from "./keyboard/refreshKeyboardFields";
import { refreshModeTexts } from "./refreshModeTexts";
import { storedUiScale } from "./storedUiScale";

export function applyMode(mode: UiMode): void {
    ui.mode = mode;
    /* `mode-touch` is about the size of the controls and therefore also applies to
     puck mode: that's also a table. What sets puck mode apart -- the bar
     gone, an add button in its place -- is tied to `mode-puck`. */
    document.body.classList.toggle("mode-touch", mode !== "laptop");
    document.body.classList.toggle("mode-laptop", mode === "laptop");
    document.body.classList.toggle("mode-puck", mode === "puck");
    // The scale belongs to the mode; it is remembered per mode.
    ui.scale = storedUiScale(mode);
    applyScale();
    (
        [
            ["modeTouch", "touch"],
            ["modeLaptop", "laptop"],
            ["modePuck", "puck"],
        ] as const
    ).forEach(([id, value]) => {
        const active = value === mode;
        el(id).classList.toggle("active", active);
        el(id).setAttribute("aria-pressed", String(active));
    });
    refreshNoteFlipLabels();
    refreshModeTexts();
    refreshKeyboardFields();
    // A window that's upside down shouldn't carry over into laptop mode,
    // so it closes when switching.
    applySides();
    closeNotes();
    if (mode === "laptop") hideKeyboards();
    /* Drag copies belong to the bar. If the bar goes away, they go with it: otherwise
     a puck is left lying on the table that can no longer be picked up anywhere. */
    if (mode === "puck") clearPucks();
    try {
        localStorage.setItem("pucktable-ui-mode", mode);
    } catch (e) {}
    resize();
}
