import type { Pin } from "./Pin";

export interface PinDrag {
    pin: Pin;
    kind: "touch" | "mouse";
    pointerId?: number;
}
