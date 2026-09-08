import { PARITY_ANGLE_DEG, PARITY_CENTRE_PX } from "./constants";
import { shortestAngleDiffDeg } from "../core/base/direction";
import type { ParityReport } from "./ParityReport";

type Reading = {
    readonly seen: boolean;
    readonly x: number;
    readonly y: number;
    readonly angleDeg: number | null;
};

/* Compares what the old pipeline says with what the new one says, and
   keeps score.
 *
 * The point of phase 6 is confidence, not features, and this is where
 * the confidence comes from. Running the two side by side proves
 * nothing on its own — the new model could be quietly wrong in a way
 * nobody notices until a puck drifts in front of an audience. This
 * counts every frame they disagree, on what, and by how much.
 *
 * Angles are compared with `shortestAngleDiffDeg` rather than
 * subtracted. Two readings either side of the wrap point are half a
 * degree apart, and plain subtraction calls that 359 — which would
 * fill the report with disagreements that are not real, and bury the
 * ones that are.
 *
 * `worst` matters more than the average. An average hides the one
 * frame in a thousand where a puck jumped, and that frame is the bug.
 */
export class ParityCheck {
    readonly #reports: ParityReport[] = [];
    #frames = 0;
    #diverged = 0;

    constructor(
        private readonly centreTolerancePX: number = PARITY_CENTRE_PX,
        private readonly angleToleranceDeg: number = PARITY_ANGLE_DEG,
    ) {}

    compare(
        at: number,
        trackId: string,
        kindId: string,
        older: Reading,
        newer: Reading,
    ): ParityReport | null {
        this.#frames += 1;

        if (!older.seen || !newer.seen) {
            /* Both blind is agreement, and the commonest case: there is
               simply no puck there. */
            if (!older.seen && !newer.seen) return null;
            return this.#record({
                at,
                trackId,
                kindId,
                centreOffPX: null,
                angleOffDeg: null,
                seenByOld: older.seen,
                seenByNew: newer.seen,
                angleKnownByOld: older.angleDeg !== null,
                angleKnownByNew: newer.angleDeg !== null,
            });
        }

        const centreOffPX = Math.hypot(newer.x - older.x, newer.y - older.y);
        const bothAngles = older.angleDeg !== null && newer.angleDeg !== null;
        const angleOffDeg = bothAngles
            ? Math.abs(shortestAngleDiffDeg(older.angleDeg, newer.angleDeg))
            : null;
        const anglesAgree =
            older.angleDeg === null && newer.angleDeg === null
                ? true
                : angleOffDeg !== null &&
                  angleOffDeg <= this.angleToleranceDeg;
        if (centreOffPX <= this.centreTolerancePX && anglesAgree) {
            return null;
        }
        return this.#record({
            at,
            trackId,
            kindId,
            centreOffPX,
            angleOffDeg,
            seenByOld: true,
            seenByNew: true,
            angleKnownByOld: older.angleDeg !== null,
            angleKnownByNew: newer.angleDeg !== null,
        });
    }

    get frameCount(): number {
        return this.#frames;
    }

    get divergenceCount(): number {
        return this.#diverged;
    }

    get reports(): readonly ParityReport[] {
        return this.#reports;
    }

    /* The single worst disagreement so far, by distance. The one to go
       and look at. */
    worst(): ParityReport | null {
        let worst: ParityReport | null = null;
        for (const report of this.#reports) {
            if (report.centreOffPX === null) return report;
            const best = worst?.centreOffPX ?? -1;
            if (report.centreOffPX > best) worst = report;
        }
        return worst;
    }

    reset(): void {
        this.#reports.length = 0;
        this.#frames = 0;
        this.#diverged = 0;
    }

    #record(report: ParityReport): ParityReport {
        this.#diverged += 1;
        this.#reports.push(report);
        return report;
    }
}
