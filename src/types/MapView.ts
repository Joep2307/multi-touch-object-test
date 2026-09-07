import type { LatLng } from "./LatLng";
import type { Point } from "./Point";

/* The map: where it's positioned, how far zoomed in, which imagery lies
   underneath, and the Web Mercator math to convert between screen pixels and
   coordinates. */
export interface MapView {
    lng: number;
    lat: number;
    zoom: number;
    set: string;
    /* Which screen edge north points to: 0° top, 90° right, … */
    north: number;
    world(): number;
    wx(lng: number): number;
    wy(lat: number): number;
    lngAt(x: number): number;
    latAt(y: number): number;
    projectRaw(lng: number, lat: number): Point;
    rotatePoint(x: number, y: number, degrees?: number): Point;
    project(lng: number, lat: number): Point;
    unproject(x: number, y: number): LatLng;
    panBy(dx: number, dy: number): void;
    zoomBy(dz: number, ax?: number, ay?: number): void;
}
