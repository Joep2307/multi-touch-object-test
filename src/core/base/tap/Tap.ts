import { Trait } from "../Trait";
import type { BaseSample } from "../BaseSample";
import type { Position } from "../position/Position";
import type { TapPolicy } from "./TapPolicy";
import type { TapSnapshot } from "./TapSnapshot";
import type { Vec2 } from "../Vec2";

const EMPTY: TapSnapshot = {
    down: false,
    dwellMS: 0,
    movedPX: 0,
    kind: "none",
};

/* How long the object has been on the glass, and what that means.
 *
 * The interval comes from the contacts themselves — the earliest
 * `firstSeen` among them — not from a timer this trait starts. A
 * timer would restart every time recognition briefly lost a foot; the
 * contacts' own timestamps survive that, so a puck that flickers
 * during a long hold still reads as one long hold.
 *
 * The verdict lands on release rather than at the threshold, because
 * until the object comes off the glass a short press and a long one
 * are the same event. `dwellMS` is live throughout, so anything that
 * wants to show progress while the hold is happening can.
 */
export class Tap extends Trait<TapSnapshot> {
    override readonly id = "tap";
    #snapshot: TapSnapshot = EMPTY;
    #downAt: number | null = null;
    #startCentre: Vec2 | null = null;
    #movedPX = 0;
    #lastTapEndedAt: number | null = null;

    constructor(
        private readonly position: Position,
        private readonly policy: TapPolicy,
    ) {
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
            this.#startCentre = centre;
            this.#movedPX = 0;
        }
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
            kind: "none",
        };
    }

    #release(at: number): void {
        const downAt = this.#downAt;
        const dwellMS = downAt === null ? 0 : Math.max(0, at - downAt);
        const moved = this.#movedPX;
        let kind: TapSnapshot["kind"] = "none";

        if (moved <= this.policy.moveMaxPX) {
            if (dwellMS <= this.policy.tapMaxMS) {
                const gap =
                    this.#lastTapEndedAt === null
                        ? Number.POSITIVE_INFINITY
                        : at - this.#lastTapEndedAt;
                kind = gap <= this.policy.doubleGapMS ? "double" : "tap";
                /* A double consumes both taps, so three quick taps
                   read as double then tap, never as two doubles. */
                this.#lastTapEndedAt = kind === "double" ? null : at;
            } else if (dwellMS >= this.policy.holdMinMS) {
                kind = "hold";
                this.#lastTapEndedAt = null;
            }
        }

        this.#downAt = null;
        this.#startCentre = null;
        this.#movedPX = 0;
        this.#snapshot = { down: false, dwellMS, movedPX: moved, kind };
    }

    override reset(): void {
        this.#snapshot = EMPTY;
        this.#downAt = null;
        this.#startCentre = null;
        this.#movedPX = 0;
        this.#lastTapEndedAt = null;
    }

    override snapshot(): TapSnapshot {
        return this.#snapshot;
    }
}
