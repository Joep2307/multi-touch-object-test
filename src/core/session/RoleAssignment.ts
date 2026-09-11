import type { PhysicalId } from "../physical";
import type { AssignmentStatus } from "./AssignmentStatus";
import type { RoleId } from "./RoleId";

/* One object holding one part, at one time.
 *
 * A record rather than a field on the physical, because it has a
 * history: who assigned it, when, and whether it is still held. "This
 * puck is a Voter" is a fact about now; "this puck was made a Voter at
 * ten past two by the Moderator and lost it when it was taken off the
 * table" is what an afternoon's account is made of.
 *
 * `assignedBy` is a physical id, and the reason the table itself is a
 * physical: an automatic assignment then has an author like every
 * other, instead of a null that every reader has to special-case.
 */
export type RoleAssignment = {
    readonly id: string;
    readonly roleId: RoleId;
    readonly assigneeId: PhysicalId;
    readonly assignedAt: number;
    readonly assignedBy: PhysicalId | null;
    readonly status: AssignmentStatus;
    /* How important this holder is, for the one overflow policy that
       ranks them. On the assignment rather than on the role, because
       every candidate for a place holds the same role and a number
       taken from the role would be the same for all of them. */
    readonly priority?: number;
};
