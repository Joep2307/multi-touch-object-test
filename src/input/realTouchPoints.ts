import { touches } from "../state";
import type { TouchPoint } from "../types";

/* What the glass is reporting, with the pointer ids carried along.
 *
 * `touches.real` is keyed by pointer id and recognition used to take only
 * the values, throwing the keys away. That was fine while every question
 * was about where the feet are; holding a puck on two feet asks *which*
 * feet, and the answer is the key. */
export function realTouchPoints(): TouchPoint[] {
    return [...touches.real.entries()].map(([id, point]) => ({
        id,
        x: point.x,
        y: point.y,
    }));
}
