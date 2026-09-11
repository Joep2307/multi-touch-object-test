import { OverflowResolver } from "../OverflowResolver";
import type { OverflowDecision } from "../OverflowResolver";
import type { RoleAssignment } from "../RoleAssignment";

/* The least important holder gives it up.
 *
 * Priority comes from outside rather than from the assignment, because
 * what makes one holder more important than another is a programme's
 * business: seniority in one session, arrival order in another. Ties
 * fall back to the oldest, so the answer is never arbitrary.
 */
export class ReplaceLowestPriorityOverflow extends OverflowResolver {
    override readonly id = "replaceLowestPriority" as const;

    override resolve(
        _role: unknown,
        held: readonly RoleAssignment[],
        priorityOf: (assignment: RoleAssignment) => number,
    ): OverflowDecision {
        const lowest = [...held].sort(
            (a, b) =>
                priorityOf(a) - priorityOf(b) || a.assignedAt - b.assignedAt,
        )[0];
        return {
            grant: lowest !== undefined,
            queued: false,
            displace: lowest ?? null,
        };
    }
}
