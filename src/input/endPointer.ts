import { movePinTo } from "../pins/movePinTo";
import { save } from "../pins/save";
import { tryConfirmPuck } from "../puck/tryConfirmPuck";
import { wasTap } from "../puck/wasTap";
import { touches } from "../state/touches";
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
