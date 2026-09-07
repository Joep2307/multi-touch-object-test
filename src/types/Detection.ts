import type { Template } from "./Template";

/* Eén herkende puck in één beeldje: welke soort, waar, hoe gedraaid. */
export interface Detection {
    tpl: Template;
    conf: number;
    x: number;
    y: number;
    angle: number;
}
