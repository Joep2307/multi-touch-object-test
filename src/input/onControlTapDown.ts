import { touches } from "../state";

/* Some touchscreens don't fire a normal `click` when there are already
   three contacts on the glass. That's exactly the normal situation with a
   physical puck: a fourth touch on "which puck is this?" or on Settings
   appeared to do nothing as a result. For buttons, only in that multitouch
   situation do we turn the short finger tap itself into a single click. The
   three puck contacts are left untouched meanwhile, so recognition and
   calibration just keep running. */
export function onControlTapDown(e: PointerEvent): void {
    if (e.pointerType === "mouse" || touches.real.size < 3) return;
    const button = (e.target as Element | null)?.closest?.(
        "button",
    ) as HTMLButtonElement | null;
    if (!button || button.disabled) return;
    touches.controlTaps.set(e.pointerId, {
        button,
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
    });
    e.preventDefault();
    e.stopPropagation();
}
