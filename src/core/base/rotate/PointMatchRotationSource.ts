import { FULL_TURN_DEG } from "../direction/constants";
import { RotationSource } from "./RotationSource";
import type { BaseSample } from "../BaseSample";
import type { RotatePolicy } from "./RotatePolicy";
import type { Vec2 } from "../Vec2";

/* Rotation with no nose at all.
 *
 * Fits this frame's feet to the previous frame's and reports the
 * rotation that best explains the difference. Nothing has to be
 * distinguishable: the feet are matched by contact id, which the touch
 * driver keeps stable for as long as a foot stays down, so the
 * question "which foot is the nose" never arises.
 *
 * That question is what broke the alternative. The standard puck's
 * apex asymmetry measures 6% against a measurement noise of 1.6%, so
 * the apex hops between feet, and each hop is either rejected —
 * losing the rotation under it — or accepted as a false turn. Measured
 * on the table recordings, a puck turned through a full circle read as
 * 97 to 203 degrees that way and reads as **351.5 degrees** this way.
 *
 * The maths is the two-dimensional case of finding the rotation that
 * best aligns two sets of matched points: centre both on their own
 * mean, then the best angle is `atan2` of the summed cross products
 * over the summed dot products. Exact, one pass, no search. It is also
 * why this is a rotation source and not a heading source — it can say
 * how far something turned without ever saying which way it faces.
 *
 * Only feet present in **both** frames are used, and a foot that
 * dropped out and came back has a new contact id, so it is correctly
 * ignored rather than matched to whichever foot happens to be nearest.
 */
export class PointMatchRotationSource extends RotationSource {
    override readonly id = "pointMatch";
    #previous: ReadonlyMap<number, Vec2> | null = null;
    #previousAt: number | null = null;

    constructor(private readonly policy: RotatePolicy) {
        super();
    }

    override step(sample: BaseSample): number | null {
        const current = new Map<number, Vec2>();
        for (const point of sample.contacts.points) {
            current.set(point.id, { x: point.x, y: point.y });
        }
        const previous = this.#previous;
        const previousAt = this.#previousAt;
        /* Only keep a frame worth comparing against. A frame with one
           foot cannot anchor the next one, and keeping it would match
           the next frame against a rotation that has no meaning. */
        if (current.size >= MIN_MATCHED) {
            this.#previous = current;
            this.#previousAt = sample.at;
        }

        if (previous === null || current.size < MIN_MATCHED) return null;
        /* And not across a gap. A puck lifted and put back has not
           turned in the meantime, however far its feet appear to have
           moved — and if the driver ever reuses a contact id, matching
           across the gap would credit it with a rotation nobody
           made. */
        if (
            previousAt !== null &&
            sample.at - previousAt > this.policy.maxGapMS
        ) {
            return null;
        }
        const angle = rotationBetween(previous, current);
        if (angle === null) return null;
        /* A physical object cannot turn this far between two frames.
           A step that large is a matching failure, not a turn — two
           feet swapping ids, or a second object's feet arriving under
           the same ids. */
        if (Math.abs(angle) > this.policy.maxStepDeg) return null;
        return angle;
    }

    override reset(): void {
        this.#previous = null;
        this.#previousAt = null;
    }
}

/* Two matched feet are enough to fix a rotation; one is not, because a
   single point is the same point at every angle. */
const MIN_MATCHED = 2;

function rotationBetween(
    previous: ReadonlyMap<number, Vec2>,
    current: ReadonlyMap<number, Vec2>,
): number | null {
    const ids: number[] = [];
    for (const id of current.keys()) {
        if (previous.has(id)) ids.push(id);
    }
    if (ids.length < MIN_MATCHED) return null;

    const from = centreOf(previous, ids);
    const to = centreOf(current, ids);
    let cross = 0;
    let dot = 0;
    for (const id of ids) {
        const a = previous.get(id);
        const b = current.get(id);
        if (a === undefined || b === undefined) continue;
        const ax = a.x - from.x;
        const ay = a.y - from.y;
        const bx = b.x - to.x;
        const by = b.y - to.y;
        cross += ax * by - ay * bx;
        dot += ax * bx + ay * by;
    }
    /* Both zero means every matched foot sits on the centre, which is
       not a shape and has no orientation. */
    if (cross === 0 && dot === 0) return null;
    return (Math.atan2(cross, dot) * FULL_TURN_DEG) / (2 * Math.PI);
}

function centreOf(
    points: ReadonlyMap<number, Vec2>,
    ids: readonly number[],
): Vec2 {
    let x = 0;
    let y = 0;
    for (const id of ids) {
        const point = points.get(id);
        if (point === undefined) continue;
        x += point.x;
        y += point.y;
    }
    return { x: x / ids.length, y: y / ids.length };
}
