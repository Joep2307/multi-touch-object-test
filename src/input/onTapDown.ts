import { learn, touches, ui } from "../state";

/* The start of a possible tap on the map; see onTapUp. */
export function onTapDown(e: PointerEvent): void {
    const t = e.target as Element | null;
    if (
        t?.closest(".panel") ||
        t?.closest("#learn") ||
        touches.puckTouches.length ||
        ui.pinMoveMode ||
        learn.open
    )
        return;
    touches.tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
}
