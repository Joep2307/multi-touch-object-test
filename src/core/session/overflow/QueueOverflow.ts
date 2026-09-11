import { OverflowResolver } from "../OverflowResolver";
import type { OverflowDecision } from "../OverflowResolver";

/* The newcomer waits its turn.
 *
 * The answer for a role with a real queue behind it — a single
 * microphone, one turn at a time. Nothing on the table is inert: the
 * object is on the glass and known about, it simply does not hold the
 * part yet.
 */
export class QueueOverflow extends OverflowResolver {
    override readonly id = "queue" as const;

    override resolve(): OverflowDecision {
        return { grant: false, queued: true, displace: null };
    }
}
