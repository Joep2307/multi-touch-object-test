import { MV } from "../map/MV";
import type { Pin } from "../types/Pin";

export function movePinTo(pin: Pin, x: number, y: number): void {
    const ll = MV.unproject(x, y);
    pin.lng = +ll.lng.toFixed(6);
    pin.lat = +ll.lat.toFixed(6);
}
