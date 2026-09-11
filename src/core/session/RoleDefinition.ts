import type { StateMachineId } from "../behaviour";
import type { KindId } from "../physical";
import type { ExtensionProperties } from "../programme";
import type { OverflowPolicy } from "./OverflowPolicy";
import type { RoleId } from "./RoleId";

/* A part an object can play.
 *
 * Not what the object is. The same wooden puck is a Voter in one mode
 * and a Player in the next, and nearly every rule worth writing is
 * about the role rather than about the wood.
 *
 * `maximumAssignments` absent means uncapped, and Voter leaves it
 * absent on purpose: some roles are meant to be held by everyone at
 * once. The cap is per role rather than one rule for the table
 * precisely because Voter and Supervisor want opposite answers.
 *
 * `priority` exists only to give `replaceLowestPriority` something to
 * compare. A role whose overflow policy is anything else can ignore
 * it.
 */
export type RoleDefinition = {
    readonly id: RoleId;
    readonly name: string;
    readonly minimumAssignments?: number;
    readonly maximumAssignments?: number;
    readonly overflowPolicy: OverflowPolicy;
    readonly eligiblePhysicalKinds?: readonly KindId[];
    readonly stateMachineId?: StateMachineId;
    readonly priority?: number;
    readonly properties?: ExtensionProperties;
};
