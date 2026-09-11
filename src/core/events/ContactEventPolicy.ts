import { Policy } from "../base/Policy";
import { CONTACT_MOVE_MIN_PX } from "./constants";

/* When a touch has moved enough to be worth an event.
 *
 * One number, and it earns its file: without it every contact
 * produces an event every frame, which is sixty a second per finger
 * saying nothing. A policy rather than a constant in the source
 * because a table with a noisier digitiser needs a different floor and
 * should not need a different build.
 */
export class ContactEventPolicy extends Policy {
    override readonly id = "contactEvent";

    constructor(readonly minMovePX: number = CONTACT_MOVE_MIN_PX) {
        super();
    }

    override describe(): Readonly<Record<string, number>> {
        return { minMovePX: this.minMovePX };
    }
}
