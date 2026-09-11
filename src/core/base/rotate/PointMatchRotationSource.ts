import { MIN_MATCHED_POINTS } from "../constants";
import { RotationSource } from "./RotationSource";
import { rigidMotionBetween } from "../rigidMotionBetween";
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
 * The maths is `rigidMotionBetween`, of which this uses only the
 * angle. It is also why this is a rotation source and not a heading
 * source — it can say how far something turned without ever saying
 * which way it faces.
 *
 * Only feet present in **both** frames are used, and a foot that
 * dropped out and came back has a new contact id, so it is correctly
 * ignored rather than matched to whichever foot happens to be nearest.
 *
 * Reconstructed feet are skipped. They are rigidly derived from the
 * real ones by exactly this motion, so including them adds no
 * information at all — and leaving them out keeps the source honest
 * about what it measured rather than about what was inferred.
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
            if (point.reconstructed === true) continue;
            current.set(point.id, { x: point.x, y: point.y });
        }
        const previous = this.#previous;
        const previousAt = this.#previousAt;
        /* Only keep a frame worth comparing against. A frame with one
           foot cannot anchor the next one, and keeping it would match
           the next frame against a rotation that has no meaning. */
        if (current.size >= MIN_MATCHED_POINTS) {
            this.#previous = current;
            this.#previousAt = sample.at;
        }

        if (previous === null || current.size < MIN_MATCHED_POINTS) {
            return null;
        }
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
        const motion = rigidMotionBetween(previous, current);
        if (motion === null) return null;
        /* A physical object cannot turn this far between two frames.
           A step that large is a matching failure, not a turn — two
           feet swapping ids, or a second object's feet arriving under
           the same ids. */
        if (Math.abs(motion.angleDeg) > this.policy.maxStepDeg) return null;
        return motion.angleDeg;
    }

    override reset(): void {
        this.#previous = null;
        this.#previousAt = null;
    }
}
