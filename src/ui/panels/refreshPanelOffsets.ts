import { panels } from "../../state";
import { applyPanelOffset } from "./applyPanelOffset";
import { clampPanel } from "./clampPanel";

export function refreshPanelOffsets(): void {
    for (const panel of panels.offsets.keys()) {
        clampPanel(panel);
        applyPanelOffset(panel);
    }
}
