import { Acceleration } from "../base/acceleration/Acceleration";
import { ApexHeadingSource } from "../base/direction/ApexHeadingSource";
import { Base } from "../base/Base";
import { Direction } from "../base/direction/Direction";
import { GapHeadingSource } from "../base/direction/GapHeadingSource";
import { HeadingRotationSource } from "../base/rotate/HeadingRotationSource";
import { Move } from "../base/move/Move";
import { PointMatchRotationSource } from "../base/rotate/PointMatchRotationSource";
import { Position } from "../base/position/Position";
import { Rotate } from "../base/rotate/Rotate";
import { SlotHeadingSource } from "../base/direction/SlotHeadingSource";
import { MotionHistory } from "../base/motion/MotionHistory";
import { Tap } from "../base/tap/Tap";
import { solverForFamily } from "./solverForFamily";
import type { BasePolicies } from "./BasePolicies";
import type { HeadingSource } from "../base/direction/HeadingSource";
import type { RotationSource } from "../base/rotate/RotationSource";
import type { PhysicalSignature } from "./PhysicalSignature";
import type { PxPerMMEstimator } from "../base/position/PxPerMMEstimator";

/* Builds the right `Base` for one way of reading one object.
 *
 * A signature, not a kind, and that is the whole of what changed when
 * kinds grew several of them. Which solver and which heading source to
 * use is a property of how the object is being read — three feet or
 * five on a ring — not of the object. A kind with two signatures would
 * otherwise have to pick one of them here, silently, and the other
 * would never be measurable.
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

    create(signature: PhysicalSignature): Base {
        const position = new Position(
            solverForFamily(signature.family),
            this.policies.position,
        );
        const direction = new Direction(position, this.#headingFor(signature));
        const move = new Move(position, this.policies.move);
        return new Base(
            position,
            direction,
            move,
            new Rotate(
                this.#rotationFor(signature, direction),
                this.policies.rotate,
                direction,
            ),
            new Tap(position),
            new MotionHistory(move, this.policies.motionHistory),
            new Acceleration(move, this.policies.acceleration),
            this.pxPerMM,
        );
    }

    /* Which way a turn is measured, per family.
     *
     * Point matching for anything whose nose is a guess. The standard
     * three-foot puck's apex asymmetry measures 6% against 1.6% of
     * measurement noise, so the apex hops between feet and a full
     * circle read as 97 to 203 degrees on the table recordings;
     * matching the feet to the previous frame reads the same
     * recording as 351.5.
     *
     * A slot puck keeps the heading source, and that is not
     * conservatism. Its identity *is* its pattern, so its orientation
     * is read exactly rather than inferred — and an absolute reading
     * does not drift, while accumulated relative steps do, a little,
     * over an afternoon. Where an exact absolute answer exists, it is
     * the better one. */
    #rotationFor(
        signature: PhysicalSignature,
        direction: Direction,
    ): RotationSource {
        switch (signature.family) {
            case "slot":
                return new HeadingRotationSource(
                    direction,
                    this.policies.rotate,
                );
            case "triad":
            case "ring":
            case "coded":
                return new PointMatchRotationSource(this.policies.rotate);
        }
    }

    #headingFor(signature: PhysicalSignature): HeadingSource {
        switch (signature.family) {
            case "triad":
                return new ApexHeadingSource(this.policies.direction);
            case "ring":
                return new GapHeadingSource(this.policies.direction);
            case "slot": {
                /* A slot puck has no distinguished foot to point at —
                   its identity is the pattern, so its orientation
                   comes from matching that pattern. Refused rather
                   than guessed if the signature does not carry its
                   code: `GapHeadingSource` would silently read the
                   widest accidental gap and hand back a plausible,
                   wrong angle. */
                const slotCode = signature.slotCode;
                if (slotCode === undefined) {
                    throw new Error(
                        `Signature "${signature.id}" is slot-coded but ` +
                            `carries no slot code, so it has no ` +
                            `orientation.`,
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
                    `Signature "${signature.id}" is coded; no heading ` +
                        `source exists for printed patterns yet.`,
                );
        }
    }
}
