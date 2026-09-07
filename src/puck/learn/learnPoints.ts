import { touches } from "../../state/touches";
import type { Point } from "../../types/Point";

/* Only real touches count — a puck dragged from the tray is a drawing and
   has nothing to learn. */
export function learnPoints(): Point[] {
    return [...touches.real.values()];
}
