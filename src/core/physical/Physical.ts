import type { ExtensionProperties } from "../programme/ExtensionProperties";
import type { PhysicalAssignment } from "./PhysicalAssignment";
import type { PhysicalId } from "./PhysicalId";
import type { PhysicalKindDefinition } from "./PhysicalKindDefinition";
import type { Presence } from "./Presence";
import type { RoleId } from "../session/RoleId";
import type { StateId } from "../behaviour/StateId";

const NO_PROPERTIES: ExtensionProperties = Object.freeze({});

/* One thing the table is dealing with.
 *
 * Deliberately wider than "a puck". The table itself is a physical,
 * and so is the reset button, because that makes an automatic change —
 * a phase timing out, the kiosk recovering — arrive through the same
 * funnel as a human action and appear in the journal the same way.
 * Without it there is a second, invisible code path for "the system
 * did it", and everything downstream needs a special case for it.
 *
 * `authoredIds` is what makes a scope of `own` possible later: every
 * record is stamped with the physical that made it, so "a player may
 * edit their own marks" needs no extra bookkeeping when roles arrive.
 * It survives being lifted, which is the point of `Presence`.
 *
 * Role, state and properties are the three things about an object the
 * table *decides*. They go through `assign` and nowhere else, which is
 * what makes them searchable: when phase C lands, an effect is the
 * only caller, and any other one shows up in one search rather than
 * hiding behind a public field anything could have written.
 */
export abstract class Physical {
    readonly authoredIds = new Set<string>();
    #roleId: RoleId | null = null;
    #currentStateId: StateId | null = null;
    #properties: ExtensionProperties = NO_PROPERTIES;

    constructor(
        readonly id: PhysicalId,
        readonly kind: PhysicalKindDefinition,
        readonly presence: Presence,
    ) {}

    /* Whether this thing has a place on the glass at all. False for
       the table itself and for the reset button, and the reason
       anything asking "where is it" must check first. */
    abstract readonly hasPose: boolean;

    /* True when it has no contacts on the glass because it never
       could — as opposed to being lifted. */
    abstract readonly virtual: boolean;

    get roleId(): RoleId | null {
        return this.#roleId;
    }

    get currentStateId(): StateId | null {
        return this.#currentStateId;
    }

    get properties(): ExtensionProperties {
        return this.#properties;
    }

    assign(change: PhysicalAssignment): void {
        if (change.roleId !== undefined) this.#roleId = change.roleId;
        if (change.currentStateId !== undefined) {
            this.#currentStateId = change.currentStateId;
        }
        if (change.properties !== undefined) {
            this.#properties = change.properties;
        }
    }
}
