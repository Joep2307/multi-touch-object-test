import { touches } from "../state/touches";

export function onControlTapUp(e: PointerEvent): void {
    const tap = touches.controlTaps.get(e.pointerId);
    if (!tap) return;
    touches.controlTaps.delete(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
    const same =
        (e.target as Element | null)?.closest?.("button") === tap.button;
    const short = performance.now() - tap.t < 700;
    const still = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 18;
    if (same && short && still && !tap.button.disabled) tap.button.click();
}
