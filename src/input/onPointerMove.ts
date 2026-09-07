import { MV } from "../map/MV";
import { movePinTo } from "../pins/movePinTo";
import { setSimPuckPosition } from "../puck/sim/setSimPuckPosition";
import { touches } from "../state/touches";
import { mapMovable } from "./mapMovable";
import { movePanelScroll } from "./movePanelScroll";
import { puckTouchByPtr } from "./puckTouchByPtr";

export function onPointerMove(e: PointerEvent): void {
    if (e.pointerType === "mouse") return;
    if (movePanelScroll(e)) return;
    const pd = touches.pinDrag;
    if (pd && pd.kind === "touch" && pd.pointerId === e.pointerId) {
        movePinTo(pd.pin, e.clientX, e.clientY);
        return;
    }
    {
        const pt = puckTouchByPtr(e.pointerId);
        if (pt) {
            pt.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const p = [...pt.ptrs.values()];
            if (p.length === 1) {
                setSimPuckPosition(
                    pt.puck,
                    p[0].x - (pt.dx ?? 0),
                    p[0].y - (pt.dy ?? 0),
                );
            } else {
                // Two fingers only rotate: the puck stays right where it is.
                const ang = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
                pt.puck.rot = (pt.baseRot ?? 0) + (ang - (pt.baseAngle ?? 0));
            }
            return;
        }
    }
    if (!touches.real.has(e.pointerId)) return;
    touches.real.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = touches.gesture;
    if (!g || !mapMovable()) return;
    if (g.n === 1 && touches.real.has(g.id)) {
        const p = touches.real.get(g.id)!;
        MV.panBy(p.x - g.x, p.y - g.y);
        g.x = p.x;
        g.y = p.y;
    } else if (g.n === 2 && g.ids.every((i) => touches.real.has(i))) {
        const a = touches.real.get(g.ids[0])!,
            b = touches.real.get(g.ids[1])!;
        const d = Math.hypot(a.x - b.x, a.y - b.y),
            mx = (a.x + b.x) / 2,
            my = (a.y + b.y) / 2;
        MV.panBy(mx - g.mx, my - g.my);
        if (g.d > 16 && d > 16) MV.zoomBy(Math.log2(d / g.d), mx, my);
        g.d = d;
        g.mx = mx;
        g.my = my;
    }
}
