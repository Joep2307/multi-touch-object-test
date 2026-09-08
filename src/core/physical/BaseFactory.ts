import { Acceleration } from "../base/acceleration/Acceleration";
import { ApexHeadingSource } from "../base/direction/ApexHeadingSource";
import { Base } from "../base/Base";
import { CentroidSolver } from "../base/position/CentroidSolver";
import { CircleFitSolver } from "../base/position/CircleFitSolver";
import { Direction } from "../base/direction/Direction";
import { GapHeadingSource } from "../base/direction/GapHeadingSource";
import { Move } from "../base/move/Move";
import { Position } from "../base/position/Position";
import { Rotate } from "../base/rotate/Rotate";
import { SlotHeadingSource } from "../base/direction/SlotHeadingSource";
import { Tail } from "../base/tail/Tail";
import { Tap } from "../base/tap/Tap";
import type { BasePolicies } from "./BasePolicies";
import type { CentreSolver } from "../base/position/CentreSolver";
import type { HeadingSource } from "../base/direction/HeadingSource";
import type { PhysicalKind } from "./PhysicalKind";
import type { PxPerMMEstimator } from "../base/position/PxPerMMEstimator";

/* Builds the right `Base` for a kind.
 *
 * This is where "which solver, which heading source" is decided, and
 * it is the only place. A new kind family is one case here plus its
 * two classes; nothing else in the core learns about it.
 *
 * The `PxPerMMEstimator` is **shared** across every physical, and that
 * is not an optimisation. How big a pixel is, is a fact about the
 * screen, not about a puck. Giving each object its own estimator would
 * let two pucks on the same table disagree about the scale, and then
 * the ring drawn around one of them would be the wrong size.
 */
export class BaseFactory {
    constructor(
        private readonly pxPerMM: PxPerMMEstimator,
        private readonly policies: BasePolicies,
    ) {}

    create(kind: PhysicalKind): Base {
        const position = new Position(
            this.#solverFor(kind),
            this.policies.position,
        );
        const direction = new Direction(position, this.#headingFor(kind));
        const move = new Move(position, this.policies.move);
        return new Base(
            position,
            direction,
            move,
            new Rotate(direction, this.policies.rotate),
            new Tap(position, this.policies.tap),
            new Tail(move, this.policies.tail),
            new Acceleration(move, this.policies.acceleration),
            this.pxPerMM,
        );
    }

    #solverFor(kind: PhysicalKind): CentreSolver {
        switch (kind.family) {
            case "triad":
                /* Three points always fit a circle exactly, so a
                   circle fit's residual would be a constant zero and
                   tell us nothing. The spread of the foot distances
                   does, because the feet are equidistant by design. */
                return new CentroidSolver();
            case "ring":
            case "slot":
                return new CircleFitSolver();
            case "coded":
                throw new Error(
                    `Kind "${kind.id}" is coded; no recogniser exists ` +
                        `for printed patterns yet.`,
                );
        }
    }

    #headingFor(kind: PhysicalKind): HeadingSource {
        switch (kind.family) {
            case "triad":
                return new ApexHeadingSource(this.policies.direction);
            case "ring":
                return new GapHeadingSource(this.policies.direction);
            case "slot": {
                /* A slot puck has no distinguished foot to point at —
                   its identity is the pattern, so its orientation
                   comes from matching that pattern. Refused rather
                   than guessed if the kind does not carry its code:
                   `GapHeadingSource` would silently read the widest
                   accidental gap and hand back a plausible, wrong
                   angle. */
                const slotCode = kind.slotCode;
                if (slotCode === undefined) {
                    throw new Error(
                        `Kind "${kind.id}" is slot-coded but carries no ` +
                            `slot code, so it has no orientation.`,
                    );
                }
                return new SlotHeadingSource(
                    this.policies.direction,
                    slotCode.slots,
                    slotCode.code,
                );
            }
            case "coded":
                throw new Error(
                    `Kind "${kind.id}" is coded; no heading source ` +
                        `exists for printed patterns yet.`,
                );
        }
    }
}
