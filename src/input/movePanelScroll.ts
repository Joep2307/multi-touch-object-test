import { touches } from "../state/touches";

export function movePanelScroll(e: PointerEvent): boolean {
    const ps = touches.panelScroll;
    if (!ps || e.pointerId !== ps.id) return false;
    const dy = e.clientY - ps.y;
    if (!ps.moved && Math.abs(dy) < 5) return true;
    ps.moved = true;
    ps.el.scrollTop = ps.top - dy / ps.scale;
    return true;
}
