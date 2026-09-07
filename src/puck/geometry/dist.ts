import type { Point } from "../../types/Point";

export const dist = (a: Point, b: Point): number =>
    Math.hypot(a.x - b.x, a.y - b.y);
