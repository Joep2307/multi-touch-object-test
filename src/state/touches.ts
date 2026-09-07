import type { ControlTap } from "../types/ControlTap";
import type { Gesture } from "../types/Gesture";
import type { MouseDrag } from "../types/MouseDrag";
import type { PanelScroll } from "../types/PanelScroll";
import type { PinDrag } from "../types/PinDrag";
import type { Point } from "../types/Point";
import type { PuckTouch } from "../types/PuckTouch";

/* Everything currently touching the glass or the mouse. */
export const touches = {
    /* The real touches, keyed by pointer id. These are the contact points
     that recognition sees. */
    real: new Map<number, Point>(),
    /* Each held drag copy has its own grip, so two hands can move two pucks
     at the same time. */
    puckTouches: [] as PuckTouch[],
    /* One finger drags the map, two fingers pinch it. Three or more is a puck,
     and a recognised puck freezes the map so it can't slide out from under it. */
    gesture: null as Gesture | null,
    mousePan: null as Point | null,
    drag: null as MouseDrag | null,
    controlTaps: new Map<number, ControlTap>(),
    panelScroll: null as PanelScroll | null,
    tapStart: null as { x: number; y: number; t: number } | null,
    pinDrag: null as PinDrag | null,
    /* Two taps in quick succession on the same pin; see doubleTap. */
    lastTapId: null as string | null,
    lastTapT: 0,
};
