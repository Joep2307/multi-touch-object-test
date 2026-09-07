import { ui } from "../state/ui";
import { refreshOrientationControl } from "./refreshOrientationControl";

export function toggleOrientation(): void {
    ui.controlsFlipped = !ui.controlsFlipped;
    try {
        localStorage.setItem(
            "pucktable-controls-flipped",
            ui.controlsFlipped ? "1" : "0",
        );
    } catch (e) {}
    refreshOrientationControl();
}
