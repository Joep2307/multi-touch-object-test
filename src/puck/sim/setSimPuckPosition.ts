import { MV } from "../../map";
import type { SimPuck } from "../../types";

export function setSimPuckPosition(puck: SimPuck, x: number, y: number): void {
    puck.x = x;
    puck.y = y;
    const ll = MV.unproject(x, y);
    puck.lng = ll.lng;
    puck.lat = ll.lat;
}
