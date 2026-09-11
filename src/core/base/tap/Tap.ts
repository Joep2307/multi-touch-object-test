import { Trait } from "../Trait";
import type { BaseSample } from "../BaseSample";
import type { Position } from "../position/Position";
import type { TapSnapshot } from "./TapSnapshot";
import type { Vec2 } from "../Vec2";

const EMPTY: TapSnapshot = {
    down: false,
    dwellMS: 0,
    movedPX: 0,
};

/* How long the object has been on the glass, and how far it wandered
   while it was.
 *
 * An interval, not an event, and that is the whole of what this trait
 * is. It reports; it does not judge. Three hundred milliseconds is a
 * tap in one programme and far too slow in another, so the thresholds
 * live in `GestureDefinition`s that a programme file can change, and
 * this trait has no policy at all. It had one, and the verdict it
 * produced meant two things in the tree could disagree about what a
 * tap was.
 *
 * The interval comes from the contacts themselves — the earliest
 * `firstSeen` among them — not from a timer this trait starts. A timer
 * would restart every time recognition briefly lost a foot; the
 * contacts' own timestamps survive that, so a puck that flickers
 * during a long hold still reads as one long hold.
 *
 * `dwellMS` and `movedPX` survive the release, so the frame the object
 * comes off the glass carries the completed episode. Anything reading
 * the down-to-up edge gets the whole story from one snapshot.
 *
 * The centre a press is measured from is the first one there **is**,
 * which is not always the first frame something was down. Both halves
 * of the interval come from the object rather than from the frame the
 * trait happened to notice it in, and for the same reason.
 */
export class Tap extends Trait<TapSnapshot> {
    override readonly id = "tap";
    #snapshot: TapSnapshot = EMPTY;
    #downAt: number | null = null;
    #startCentre: Vec2 | null = null;
    #movedPX = 0;

    constructor(private readonly position: Position) {
        super();
    }

    override update(sample: BaseSample): void {
        const points = sample.contacts.points;
        const centre = this.position.snapshot().centre;

        if (points.length === 0) {
            if (this.#downAt !== null) this.#release(sample.at);
            return;
        }

        let firstSeen = Number.POSITIVE_INFINITY;
        for (const p of points) {
            if (p.firstSeen < firstSeen) firstSeen = p.firstSeen;
        }
        if (this.#downAt === null) {
            this.#downAt = firstSeen;
            this.#movedPX = 0;
        }
        /* From the first frame that *has* a centre, not from the first
           frame something was down. Feet rarely land together: one
           touch arrives, `Position` has too few to solve, and taking
           the centre there left `#startCentre` null for the whole
           press — so `movedPX` stayed at zero and a 240 px drag was
           reported as a tap. */
        this.#startCentre ??= centre;
        if (this.#startCentre !== null && centre !== null) {
            const d = Math.hypot(
                centre.x - this.#startCentre.x,
                centre.y - this.#startCentre.y,
            );
            if (d > this.#movedPX) this.#movedPX = d;
        }
        this.#snapshot = {
            down: true,
            dwellMS: Math.max(0, sample.at - this.#downAt),
            movedPX: this.#movedPX,
        };
    }

    #release(at: number): void {
        const downAt = this.#downAt;
        const dwellMS = downAt === null ? 0 : Math.max(0, at - downAt);
        this.#snapshot = {
            down: false,
            dwellMS,
            movedPX: this.#movedPX,
        };
        this.#downAt = null;
        this.#startCentre = null;
        this.#movedPX = 0;
    }

    override reset(): void {
        this.#snapshot = EMPTY;
        this.#downAt = null;
        this.#startCentre = null;
        this.#movedPX = 0;
    }

    override snapshot(): TapSnapshot {
        return this.#snapshot;
    }
}
