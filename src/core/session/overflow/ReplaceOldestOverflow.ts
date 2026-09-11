import { OverflowResolver } from "../OverflowResolver";
import type { OverflowDecision } from "../OverflowResolver";
import type { RoleAssignment } from "../RoleAssignment";

/* Whoever has held it longest gives it up.
 *
 * The answer that keeps a table moving with strangers around it:
 * putting an object down always does something, and the part passes to
 * whoever most recently asked for it. The cost is that it can be taken
 * from someone mid-thought, which is exactly why the choice is per
 * role.
 */
export class ReplaceOldestOverflow extends OverflowResolver {
    override readonly id = "replaceOldest" as const;

    override resolve(
        _role: unknown,
        held: readonly RoleAssignment[],
    ): OverflowDecision {
        const oldest = [...held].sort(
            (a, b) => a.assignedAt - b.assignedAt,
        )[0];
        return {
            grant: oldest !== undefined,
            queued: false,
            displace: oldest ?? null,
        };
    }
}
