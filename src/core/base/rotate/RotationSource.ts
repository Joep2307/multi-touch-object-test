import type { BaseSample } from "../BaseSample";

/* Where a turn is measured from.
 *
 * Two genuinely different answers, and the table has proved it needs
 * the second. A heading source names a nose and rotation is the change
 * in where that nose points — which works only as well as the nose is
 * distinguishable. Point matching names nothing: it fits this frame's
 * feet to the previous frame's and reports the rotation that best
 * explains the difference.
 *
 * Measured on the seven recordings made at the table on 9 September
 * 2026. A puck turned through a full circle reads as **351.5 degrees**
 * by point matching. By apex heading it read 97 to 203 degrees, at
 * every combination of threshold tried, because the apex hops between
 * feet whenever the real asymmetry (6%) is close to the measurement
 * noise (1.6%) — and each hop is either rejected, losing the rotation
 * under it, or accepted as a false turn.
 *
 * Returns `null` when this frame cannot be measured at all, which
 * `Rotate` treats as a pause rather than as zero. The difference
 * matters: a puck that loses a foot mid-turn should pick the turn up
 * where it left off, not record that it stopped.
 */
export abstract class RotationSource {
    abstract readonly id: string;

    /* How far the object turned since the last measurable frame, in
       degrees, signed. Null when there is nothing to compare. */
    abstract step(sample: BaseSample): number | null;

    abstract reset(): void;
}
