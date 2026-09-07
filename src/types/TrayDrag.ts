import type { Template } from "./Template";

/* A puck being dragged out of the tray, with its ghost under the finger. */
export interface TrayDrag {
    tpl: Template;
    ghost: HTMLElement;
    node: HTMLElement;
    x0: number;
    y0: number;
}
