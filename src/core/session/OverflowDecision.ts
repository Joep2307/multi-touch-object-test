import type { RoleAssignment } from "./RoleAssignment";

/* What to do about the object that arrived one too late.
 *
 * The decision is returned rather than applied, so a resolver can be
 * read and tested on its own and the assigner stays the only thing
 * that writes. `displace` names an assignment that has to give up its
 * place first.
 */
export type OverflowDecision = {
    readonly grant: boolean;
    readonly queued: boolean;
    readonly displace: RoleAssignment | null;
};
