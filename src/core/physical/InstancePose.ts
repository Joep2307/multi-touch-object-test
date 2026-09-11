import type { Vec2 } from "../base/Vec2";

/* Where an object is and which way it faces, as anything above the
   recognition layer sees it.
 *
 * `directionKnown` rides alongside `directionDeg` rather than making
 * the angle nullable, because the last good heading is worth keeping
 * and worth drawing: a puck that has briefly lost a foot has not
 * stopped pointing somewhere. A consumer that must not act on a stale
 * angle checks the flag; one that only draws does not have to.
 *
 * `sizePX` is the object's outer edge at the table's current scale,
 * from the kind — never the measurement. A ring drawn from what was
 * measured breathes with sensor noise.
 */
export type InstancePose = {
    readonly position: Vec2 | null;
    readonly directionDeg: number;
    readonly directionKnown: boolean;
    readonly sizePX: number;
};
