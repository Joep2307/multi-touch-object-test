import { OverflowResolver } from "../OverflowResolver";
import type { OverflowDecision } from "../OverflowDecision";

/* Everyone holds it, over the cap.
 *
 * The honest answer when the cap is advice rather than a rule: a
 * ninth voter at an eight-voter table is a person who turned up, and
 * refusing them is worse than counting them. The overflow is visible
 * because the assignments outnumber the maximum, so a programme that
 * cares can notice and say something.
 */
export class AllowTemporarilyOverflow extends OverflowResolver {
    override readonly id = "allowTemporarily" as const;

    override resolve(): OverflowDecision {
        return { grant: true, queued: false, displace: null };
    }
}
