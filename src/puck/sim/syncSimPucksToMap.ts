import { MV } from "../../map/MV";
import { sim } from "../../state/sim";
import { touches } from "../../state/touches";
import { trackForSim } from "../trackForSim";

/* Simulated pucks are map markers: their physical size stays constant, while
   their screen position follows the same geographic point during pan/zoom.
   Move the matching track by the same delta so a map transform is not mistaken
   for someone moving the puck to create a second contribution. */
export function syncSimPucksToMap(): void {
    for (const s of sim.pucks) {
        if (!Number.isFinite(s.lng) || !Number.isFinite(s.lat)) {
            const ll = MV.unproject(s.x, s.y);
            s.lng = ll.lng;
            s.lat = ll.lat;
        }
        if (
            touches.drag?.puck === s ||
            touches.puckTouches.some((t) => t.puck === s)
        )
            continue;
        const p = MV.project(s.lng, s.lat),
            dx = p.x - s.x,
            dy = p.y - s.y;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) continue;
        s.x = p.x;
        s.y = p.y;
        const t = trackForSim(s);
        if (t) {
            t.x += dx;
            t.y += dy;
            t.anchorX += dx;
            t.anchorY += dy;
            // The zoom anchor point shifts along too: a puck that slides out from
            // under itself because of the map hasn't been pushed forward by anyone,
            // and so shouldn't zoom either. Otherwise one puck would send the
            // other's zoom out of control.
            if (t.zoomRefY != null) t.zoomRefY += dy;
            t.buf = t.buf.map((q) => ({ x: q.x + dx, y: q.y + dy }));
        }
    }
}
