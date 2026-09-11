import { movePinTo, save } from "../pins";
import { tryConfirmPuck, wasTap } from "../puck";
import { touches } from "../state";
import { basePuckTouch } from "./basePuckTouch";
import { endPanelScroll } from "./endPanelScroll";
import { puckTouchByPtr } from "./puckTouchByPtr";
import { syncGesture } from "./syncGesture";

export function endPointer(e: PointerEvent): void {
    if (endPanelScroll(e)) return;
    const pd = touches.pinDrag;
    if (pd && pd.kind === "touch" && pd.pointerId === e.pointerId) {
        movePinTo(pd.pin, e.clientX, e.clientY);
        touches.pinDrag = null;
        document.body.classList.remove("dragging-dot");
        save();
        return;
    }
    {
        const pt = puckTouchByPtr(e.pointerId);
        if (pt) {
            pt.ptrs.delete(e.pointerId);
            if (pt.ptrs.size === 0) {
                touches.puckTouches.splice(touches.puckTouches.indexOf(pt), 1);
                if (wasTap(pt)) tryConfirmPuck(e.clientX, e.clientY);
            } else basePuckTouch(pt);
            return;
        }
    }
    touches.real.delete(e.pointerId);
    syncGesture();
}
