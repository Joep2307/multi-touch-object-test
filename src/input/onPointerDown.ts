import { closeNotes } from "../notes";
import { pinAt } from "../pins";
import { simPuckAt } from "../puck/sim";
import { touches, ui } from "../state";
import { basePuckTouch } from "./basePuckTouch";
import { nearestPuckTouch } from "./nearestPuckTouch";
import { startPanelScroll } from "./startPanelScroll";
import { syncGesture } from "./syncGesture";
import { uiChrome } from "./uiChrome";
import type { PuckTouch } from "../types";

/* The main handler for touches on the glass. */
export function onPointerDown(e: PointerEvent): void {
    /* The measurement window swallows no touch at all, not even on its own
     buttons: a puck lying half under the card should simply be read,
     otherwise it says "waiting for three contact points" while the puck is
     right there. A finger pressing a button still counts as a contact point
     for as long as it's down and disappears again on release; the map stays
     still during measuring anyway (see `mapMovable`). */
    const chrome = uiChrome(e.target);
    if (chrome) {
        // A finger on the controls scrolls itself; see startPanelScroll.
        if (e.pointerType !== "mouse") startPanelScroll(e, chrome);
        return;
    }
    if (e.pointerType === "mouse") return;
    if (ui.pinMoveMode) {
        e.preventDefault();
        const pin = pinAt(e.clientX, e.clientY);
        if (pin) {
            touches.pinDrag = { pin, pointerId: e.pointerId, kind: "touch" };
            document.body.classList.add("dragging-dot");
            closeNotes();
        }
        touches.gesture = null;
        return;
    }
    // A finger on a simulated puck grabs it: one finger slides, a second
    // finger twists it to pick a theme without moving it. A finger on ANOTHER
    // puck starts its own grip — that's how you move two pucks at once. A
    // finger next to the pucks joins in with the nearest grip.
    {
        const onPuck = simPuckAt(e.clientX, e.clientY);
        let pt: PuckTouch | null = onPuck
            ? (touches.puckTouches.find((t) => t.puck === onPuck) ?? null)
            : touches.puckTouches.length
              ? nearestPuckTouch(e.clientX, e.clientY)
              : null;
        if (!pt && onPuck) {
            pt = {
                puck: onPuck,
                ptrs: new Map(),
                t0: performance.now(),
                px: onPuck.x,
                py: onPuck.y,
                rot0: onPuck.rot,
            };
            touches.puckTouches.push(pt);
        }
        if (pt) {
            pt.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
            basePuckTouch(pt);
            touches.gesture = null;
            return;
        }
    }
    touches.real.set(e.pointerId, { x: e.clientX, y: e.clientY });
    syncGesture();
}
