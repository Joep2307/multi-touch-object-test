import { panels } from "../../state/panels";
import { applyPanelOffset } from "./applyPanelOffset";

export function resetPanelOffset(panel: HTMLElement | null): void {
    if (!panel) return;
    panels.offsets.delete(panel);
    panel.classList.remove("snap-home");
    applyPanelOffset(panel);
}
