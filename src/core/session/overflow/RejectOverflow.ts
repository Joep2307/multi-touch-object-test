import { OverflowResolver } from "../OverflowResolver";
import type { OverflowDecision } from "../OverflowDecision";

/* The newcomer gets nothing.
 *
 * The safe answer, and the right one whenever taking over would be
 * dangerous: a second Supervisor puck put down by mistake must not
 * quietly take the map away from the person holding it.
 */
export class RejectOverflow extends OverflowResolver {
    override readonly id = "reject" as const;

    override resolve(): OverflowDecision {
        return { grant: false, queued: false, displace: null };
    }
}
