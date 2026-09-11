import { el } from "../dom";
import { tr } from "../i18n";
import { ui } from "../state";

/* ── Screen orientation ────────────────────────────────────────────────
   The map is the shared object and stays put; only the control layers
   rotate a quarter turn without changing the map. */
export function refreshOrientationControl(): void {
    document.body.classList.toggle("controls-flipped", ui.controlsFlipped);
    el("orientationLabel").textContent = tr(
        ui.controlsFlipped ? "rotateControlsBack" : "rotateControls",
    );
    el("btnOrientation").setAttribute(
        "aria-label",
        el("orientationLabel").textContent ?? "",
    );
    el("btnOrientation").setAttribute(
        "aria-pressed",
        String(ui.controlsFlipped),
    );
    el("orientationHint").textContent = tr("orientationHint");
}
