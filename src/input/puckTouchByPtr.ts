import { touches } from "../state";
import type { PuckTouch } from "../types";

export const puckTouchByPtr = (id: number): PuckTouch | undefined =>
    touches.puckTouches.find((t) => t.ptrs.has(id));
