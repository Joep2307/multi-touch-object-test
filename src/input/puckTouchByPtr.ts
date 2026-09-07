import { touches } from "../state/touches";
import type { PuckTouch } from "../types/PuckTouch";

export const puckTouchByPtr = (id: number): PuckTouch | undefined =>
    touches.puckTouches.find((t) => t.ptrs.has(id));
