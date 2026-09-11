import type { OverflowPolicy } from "./OverflowPolicy";
import type { RoleAssignment } from "./RoleAssignment";
import type { RoleDefinition } from "./RoleDefinition";
import type { OverflowDecision } from "./OverflowDecision";

/* One answer to the overflow question.
 *
 * A class each rather than a switch, because these are genuinely
 * different rules and a programme may want one the core never thought
 * of. Which one applies is a field on the role, not a setting for the
 * table: taking over is right for a single Supervisor and wrong for a
 * queue of Voters, and both can be true on the same table at once.
 */
export abstract class OverflowResolver {
    abstract readonly id: OverflowPolicy;

    abstract resolve(
        role: RoleDefinition,
        held: readonly RoleAssignment[],
        priorityOf: (assignment: RoleAssignment) => number,
    ): OverflowDecision;
}
