import type { Vec2 } from "../base";

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
 *
 * `held` says this pose was read from a footprint one of whose feet
 * was reconstructed rather than reported. The object is there and the
 * pose is real — that is what reconstructing it is for — but a drawing
 * may honestly say so, which is what the old table does at 35% alpha
 * for the same reason. Its natural companion is `status`: a held
 * object is `detected`, not `missing`.
 */
export type InstancePose = {
    readonly position: Vec2 | null;
    readonly directionDeg: number;
    readonly directionKnown: boolean;
    readonly sizePX: number;
    readonly held: boolean;
};
