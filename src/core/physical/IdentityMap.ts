import { isTangible } from "./isTangible";
import type { Vec2 } from "../base";
import type { KindId } from "./KindId";
import type { PhysicalRegistry } from "./PhysicalRegistry";
import type { Physical } from "./Physical";

/* Is this a returning object, or a new one?
 *
 * The question the table has to answer every time something appears
 * on the glass, and getting it wrong is expensive in both directions.
 * Call a returning puck new and it loses whatever it authored; call a
 * new puck a returning one and it inherits a stranger's history.
 *
 * Two conditions, and both are needed. Same kind, because kind alone
 * would hand one puck's history to any other of the same design. And
 * near the same place, because a puck picked up and put down across
 * the table is being used as a new thing even if it is the same
 * object — that is what `maxReturnPX` is for.
 *
 * This replaces the `tracks.memory` lookup in the old code, where the
 * same two conditions were spelled out inline at the one call site
 * that needed them.
 */
export class IdentityMap {
    constructor(
        private readonly registry: PhysicalRegistry,
        private readonly maxReturnPX: number,
    ) {}

    /* The physical this sighting belongs to, or `null` if it is new. */
    resolve(kindId: KindId, centre: Vec2): Physical | null {
        let best: Physical | null = null;
        let bestDistance = this.maxReturnPX;
        for (const physical of this.registry.recoverable()) {
            if (physical.kind.id !== kindId) continue;
            if (!isTangible(physical)) continue;
            const where = physical.lastKnownCentre;
            if (where === null) continue;
            const d = Math.hypot(where.x - centre.x, where.y - centre.y);
            if (d <= bestDistance) {
                bestDistance = d;
                best = physical;
            }
        }
        return best;
    }
}
