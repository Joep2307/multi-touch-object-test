import { movePinTo, save } from "../pins";
import { tryConfirmPuck, wasTap } from "../puck";
import { touches } from "../state";

export function onMouseUp(e: MouseEvent): void {
    const pd = touches.pinDrag;
    if (pd && pd.kind === "mouse") {
        movePinTo(pd.pin, e.clientX, e.clientY);
        touches.pinDrag = null;
        document.body.classList.remove("dragging-dot");
        save();
    }
    if (touches.drag && wasTap(touches.drag))
        tryConfirmPuck(e.clientX, e.clientY);
    touches.drag = null;
    touches.mousePan = null;
}
