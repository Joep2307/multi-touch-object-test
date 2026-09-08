import { VirtualPhysical } from "./VirtualPhysical";

/* A phone or a second screen, acting on the table from elsewhere.
 *
 * Nothing builds one of these yet. It exists as a name so that
 * identity is never quietly tied to having contacts on this table's
 * glass — the assumption that would otherwise be made everywhere, and
 * the one that makes remote participation a rewrite rather than an
 * addition.
 */
export class RemotePhysical extends VirtualPhysical {}
