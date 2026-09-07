import { MV } from "../map/MV";
import { pins } from "../state/pins";
import type { Pin } from "../types/Pin";

/* The topmost marker under a point, with a finger-width margin. */
export function pinAt(x: number, y: number): Pin | undefined {
    return [...pins.list].reverse().find((pin) => {
        const p = MV.project(pin.lng, pin.lat);
        return Math.hypot(p.x - x, p.y - y) < 32;
    });
}
