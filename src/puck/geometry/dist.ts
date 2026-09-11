import type { Point } from "../../types";

export const dist = (a: Point, b: Point): number =>
    Math.hypot(a.x - b.x, a.y - b.y);
