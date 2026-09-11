import { el } from "../dom";
import { tr } from "../i18n";
import { ui } from "../state";
import { puckMode } from "./puckMode";

/* Two lines of text are about the bar at the bottom, and that bar isn't
   there in puck mode. They're grouped together here because both switching
   mode and switching language need to reset them. */
export function refreshModeTexts(): void {
    [...document.querySelectorAll<HTMLElement>(".puck-hint")].forEach(
        (h) =>
            (h.textContent =
                ui.mode === "laptop" ? tr("laptopHint") : tr("touchHint")),
    );
    el("sidesHint").textContent = tr(
        puckMode() ? "sidesHintPuck" : "sidesHint",
    );
}
