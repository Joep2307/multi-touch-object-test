import type { Template } from "./Template";

/* A drag copy from the tray: a drawn puck without physical pads. It's a
   map marker — its screen position follows the same geographic point while
   panning and zooming. */
export interface SimPuck {
    tpl: Template;
    uid: number;
    x: number;
    y: number;
    lng: number;
    lat: number;
    rot: number;
}
