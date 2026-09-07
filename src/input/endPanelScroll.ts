import { panels } from "../state/panels";
import { touches } from "../state/touches";

export function endPanelScroll(e: PointerEvent): boolean {
    const ps = touches.panelScroll;
    if (!ps || e.pointerId !== ps.id) return false;
    // A swipe is not a tap: the click that follows it must not press a button.
    if (ps.moved) panels.dragEnd = performance.now();
    touches.panelScroll = null;
    return true;
}
