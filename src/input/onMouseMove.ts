import { MV } from "../map";
import { movePinTo } from "../pins";
import { setSimPuckPosition } from "../puck/sim";
import { touches } from "../state";

export function onMouseMove(e: MouseEvent): void {
    const pd = touches.pinDrag;
    if (pd && pd.kind === "mouse") {
        movePinTo(pd.pin, e.clientX, e.clientY);
        return;
    }
    const mp = touches.mousePan;
    if (mp) {
        MV.panBy(e.clientX - mp.x, e.clientY - mp.y);
        mp.x = e.clientX;
        mp.y = e.clientY;
        return;
    }
    const drag = touches.drag;
    if (!drag) return;
    if (drag.rotate)
        drag.puck.rot =
            drag.r0 +
            (Math.atan2(e.clientY - drag.puck.y, e.clientX - drag.puck.x) -
                drag.a0);
    else
        setSimPuckPosition(
            drag.puck,
            e.clientX - drag.ox,
            e.clientY - drag.oy,
        );
}
