import { touches } from "../state/touches";
import { scrollableFrom } from "./scrollableFrom";

/* ── Scrolling in the UI chrome ──────────────────────────────────────────
   At a table there's always something on the glass. As soon as there's
   more than one contact point, the browser no longer sees a swipe gesture
   but a multitouch gesture, and then it stops scrolling a panel: with a
   puck on the table the menu just sat still under your finger. On a laptop
   with a single finger it works fine, so this only shows up on the table —
   and there it's the only way to reach the bottom of a list.

   The panels are therefore set to `touch-action:none` and the scrolling
   happens here, driven by the finger that started it. */
export function startPanelScroll(e: PointerEvent, root: HTMLElement): void {
    const target = scrollableFrom(e.target, root);
    if (!target) return;
    // The panel is scaled with `zoom`, so a screen pixel is not one pixel in
    // the panel itself. The ratio follows from its own two measurements.
    const scale =
        target.getBoundingClientRect().height / (target.offsetHeight || 1) ||
        1;
    touches.panelScroll = {
        id: e.pointerId,
        el: target,
        y: e.clientY,
        top: target.scrollTop,
        scale,
        moved: false,
    };
}
