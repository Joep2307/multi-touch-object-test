import { Physical } from "./Physical";
import type { Base } from "../base/Base";
import type { ContactSet } from "../contact/ContactSet";
import type { PhysicalId } from "./PhysicalId";
import type { PhysicalKindDefinition } from "./PhysicalKindDefinition";
import type { PhysicalSignature } from "./PhysicalSignature";
import type { Presence } from "./Presence";
import type { Vec2 } from "../base/Vec2";

/* A physical that is actually on the glass, and therefore has a
   `Base` measuring it.
 *
 * This is where the model meets the kinematics: one update per frame
 * advances the traits and then the presence, in that order. Presence
 * has to come second because whether the object is still here is
 * `Position`'s answer, and asking before the traits have run would
 * decide on the previous frame's evidence — a one-frame lag that
 * shows up as a puck flickering on the edge of recognition.
 */
export abstract class TangibleObject extends Physical {
    override readonly hasPose = true;
    /* Widened from the literal on purpose: `SimulatedPuck` is a
       tangible object that is nonetheless not real, and a literal
       `false` here would forbid the subclass from saying so. */
    override readonly virtual: boolean = false;
    #lastKnownCentre: Vec2 | null = null;

    constructor(
        id: PhysicalId,
        kind: PhysicalKindDefinition,
        /* Which of the kind's signatures this object is being read
           by. An instance runs on one of them for its whole life: the
           solver and the heading source inside `base` were chosen for
           it, so changing it would mean a different base. */
        readonly signature: PhysicalSignature,
        presence: Presence,
        readonly base: Base,
    ) {
        super(id, kind, presence);
    }

    update(at: number, contacts: ContactSet): void {
        this.base.update(at, contacts, this.signature.geometry);
        const position = this.base.position.snapshot();
        if (position.sensed && position.centre !== null) {
            /* Position quite properly clears a missing measurement.
               Identity recovery still needs the last accepted place. */
            this.#lastKnownCentre = {
                x: position.centre.x,
                y: position.centre.y,
            };
        }
        this.presence.update(position.sensed, at);
    }

    get lastKnownCentre(): Vec2 | null {
        return this.#lastKnownCentre;
    }

    /* What the object's outer edge measures on screen right now.
       Comes from the kind and the table's current scale, never from
       the measurement — a ring drawn from the frame breathes with
       sensor noise. */
    outerDiameterPX(): number {
        return this.base.outerDiameterPX(this.signature.geometry);
    }
}
