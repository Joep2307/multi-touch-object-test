import type { ContactSet } from "../contact";
import type { BaseSample } from "./BaseSample";
import type { BaseSnapshot } from "./BaseSnapshot";
import type { FootprintCompletion } from "./FootprintCompletion";
import type { FootprintSpec } from "./FootprintSpec";
import type { Acceleration } from "./acceleration";
import type { Direction } from "./direction";
import type { MotionHistory } from "./motion";
import type { Move } from "./move";
import type { Position, PxPerMMEstimator } from "./position";
import type { Rotate } from "./rotate";
import type { Tap } from "./tap";

/* The kinematic truth about one object, and the container its traits
   live in.
 *
 * The update order is the only thing this class decides, and it is not
 * arbitrary. `Position` runs first because a heading is an angle from
 * a centre and a displacement is a distance between two centres — all
 * of it needs a middle point before it means anything. The estimator
 * runs second, on the reading that just came in, so the corrected
 * scale is ready for the *next* frame; using it on the frame that
 * produced it would be a loop feeding itself. `Direction` runs last.
 *
 * Traits are constructor-injected rather than built here, so a test
 * can hand in a stub and phase 5 can build a base per kind without
 * this file learning what a kind is.
 *
 * `Move`, `Rotate` and `Tap` run after `Direction` because each reads
 * a snapshot the earlier traits produced. `MotionHistory` and `Acceleration`
 * come last: they are the derived tier and read only what tier one
 * already computed — `Move`'s smoothed displacement, never the raw
 * frame. That ordering is what makes the tier boundary real rather
 * than a convention.
 *
 * Before any of them runs, `FootprintCompletion` fills in whatever feet
 * the frame is short of. It is here rather than inside a trait so that
 * every trait sees one whole footprint and none of them has to learn
 * that holding on exists — and because `Direction`'s source reads the
 * frame's points directly, so putting it in `Position` would leave the
 * heading measuring a different set from the centre.
 */
export class Base {
    constructor(
        readonly position: Position,
        readonly direction: Direction,
        readonly move: Move,
        readonly rotate: Rotate,
        readonly tap: Tap,
        readonly motionHistory: MotionHistory,
        readonly acceleration: Acceleration,
        readonly pxPerMM: PxPerMMEstimator,
        readonly completion: FootprintCompletion,
    ) {}

    update(at: number, contacts: ContactSet, spec: FootprintSpec): void {
        const sample: BaseSample = {
            at,
            contacts: this.completion.complete(contacts, spec),
            spec,
            pxPerMM: this.pxPerMM.value,
        };
        this.position.update(sample);
        /* After `Position`, because whether this frame is worth
           keeping as a reference is `Position`'s answer, and asking
           first would judge it on the previous frame's evidence. */
        this.completion.remember(sample.contacts, this.position.snapshot());
        this.pxPerMM.observe(this.position.snapshot(), sample);
        this.direction.update(sample);
        this.move.update(sample);
        this.rotate.update(sample);
        this.tap.update(sample);
        this.motionHistory.update(sample);
        this.acceleration.update(sample);
    }

    /* What the object's outer edge measures on screen, in pixels.
     *
     * Sized from the kind and the current scale, never from the
     * frame's measurement: a ring drawn from the measurement breathes
     * with sensor noise. This is the number that makes the drawn ring
     * sit on the physical rim, and it is why the edge belongs to the
     * kind rather than to one global radius in the renderer. */
    outerDiameterPX(spec: FootprintSpec): number {
        return spec.outerDiameterMM * this.pxPerMM.value;
    }

    snapshot(at: number): BaseSnapshot {
        return {
            at,
            pxPerMM: this.pxPerMM.value,
            position: this.position.snapshot(),
            direction: this.direction.snapshot(),
            move: this.move.snapshot(),
            rotate: this.rotate.snapshot(),
            tap: this.tap.snapshot(),
            motionHistory: this.motionHistory.snapshot(),
            acceleration: this.acceleration.snapshot(),
        };
    }

    reset(): void {
        this.position.reset();
        this.direction.reset();
        this.move.reset();
        this.rotate.reset();
        this.tap.reset();
        this.motionHistory.reset();
        this.acceleration.reset();
        this.pxPerMM.reset();
        this.completion.reset();
    }
}
