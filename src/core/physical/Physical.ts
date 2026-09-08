import type { PhysicalId } from "./PhysicalId";
import type { PhysicalKind } from "./PhysicalKind";
import type { Presence } from "./Presence";

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
 */
export abstract class Physical {
    readonly authoredIds = new Set<string>();

    constructor(
        readonly id: PhysicalId,
        readonly kind: PhysicalKind,
        readonly presence: Presence,
    ) {}

    /* Whether this thing has a place on the glass at all. False for
       the table itself and for the reset button, and the reason
       anything asking "where is it" must check first. */
    abstract readonly hasPose: boolean;

    /* True when it has no contacts on the glass because it never
       could — as opposed to being lifted. */
    abstract readonly virtual: boolean;
}
