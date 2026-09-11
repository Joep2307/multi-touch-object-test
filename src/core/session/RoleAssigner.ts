import {
    AllowTemporarilyOverflow,
    QueueOverflow,
    RejectOverflow,
    ReplaceLowestPriorityOverflow,
    ReplaceOldestOverflow,
} from "./overflow";
import type { PhysicalId, PhysicalInstance } from "../physical";
import type { OverflowResolver } from "./OverflowResolver";
import type { RoleAssignment } from "./RoleAssignment";
import type { RoleDefinition } from "./RoleDefinition";
import type { RoleId } from "./RoleId";

/* Who holds which part, and what happens when one too many asks.
 *
 * The interesting case is the ninth voter at an eight-voter table. A
 * physical table cannot refuse to have a ninth block put on it, so the
 * model has to say what happens rather than design the case away — and
 * the answer is a property of the role, because taking over is right
 * for a single Supervisor and wrong for a queue of Voters.
 *
 * **A lift is not a departure.** A puck picked up to point at
 * something keeps its part; it loses it only when the table has
 * forgotten the object entirely. Anything else would cost someone
 * their vote every time they gestured with their token.
 */
export class RoleAssigner {
    readonly #assignments: RoleAssignment[] = [];
    readonly #resolvers = new Map<string, OverflowResolver>();
    #nextId = 0;

    constructor(
        private readonly roles: readonly RoleDefinition[],
        resolvers: readonly OverflowResolver[] = defaultResolvers(),
    ) {
        for (const resolver of resolvers) {
            this.#resolvers.set(resolver.id, resolver);
        }
    }

    all(): readonly RoleAssignment[] {
        return this.#assignments;
    }

    active(roleId: RoleId): readonly RoleAssignment[] {
        return this.#assignments.filter(
            (a) => a.roleId === roleId && a.status === "active",
        );
    }

    roleOf(assigneeId: PhysicalId): RoleId | null {
        for (let i = this.#assignments.length - 1; i >= 0; i -= 1) {
            const assignment = this.#assignments[i];
            if (assignment === undefined) continue;
            if (
                assignment.assigneeId === assigneeId &&
                assignment.status === "active"
            ) {
                return assignment.roleId;
            }
        }
        return null;
    }

    /* Give an object a part, applying the role's overflow policy when
       there is no room. Returns what was actually granted, which may
       be nothing. */
    assign(
        assigneeId: PhysicalId,
        roleId: RoleId,
        at: number,
        assignedBy: PhysicalId | null = null,
        priority = 0,
    ): RoleAssignment | null {
        const role = this.roles.find((r) => r.id === roleId);
        if (role === undefined) return null;
        if (this.roleOf(assigneeId) === roleId) return null;

        /* Taking a part means letting go of the one before it. Leaving
           the old assignment open consumed its role's only place for
           the rest of the session, held by an object that had visibly
           moved on — and nothing on the table said why nobody else
           could take it. Queued entries go too, or an object re-offered
           a part it is already waiting for stacks up duplicates and
           ends up holding one place twice. */
        this.#release(assigneeId, at);

        const held = this.active(roleId);
        const max = role.maximumAssignments;
        if (max !== undefined && held.length >= max) {
            const resolver = this.#resolvers.get(role.overflowPolicy);
            if (resolver === undefined) return null;
            const decision = resolver.resolve(role, held, priorityOf);
            if (decision.displace !== null) {
                this.#replace(decision.displace, "removed");
            }
            if (decision.queued) {
                return this.#add(
                    assigneeId,
                    roleId,
                    at,
                    assignedBy,
                    "queued",
                    priority,
                );
            }
            if (!decision.grant) return null;
        }
        return this.#add(
            assigneeId,
            roleId,
            at,
            assignedBy,
            "active",
            priority,
        );
    }

    /* Can this object hold this part at all? A role may be restricted
       to certain kinds, which is how a printed card and a wooden puck
       can be told apart without either of them knowing about roles. */
    eligible(instance: PhysicalInstance, role: RoleDefinition): boolean {
        const kinds = role.eligiblePhysicalKinds;
        return kinds === undefined || kinds.includes(instance.kindId);
    }

    /* The same question with the role looked up here, so a caller that
       holds an id rather than a definition does not have to go find one
       — and so there is one answer rather than two. A role nobody
       defined is one nothing is eligible for. */
    eligibleFor(instance: PhysicalInstance, roleId: RoleId): boolean {
        const role = this.roles.find((r) => r.id === roleId);
        return role !== undefined && this.eligible(instance, role);
    }

    /* The part this object is standing in line for, if any.
     *
     * Asked before a part is offered again. An object waiting in a
     * queue holds no role, so anything that offers parts to whoever has
     * none would offer this one again — and taking the offer means
     * letting go of the place it was already holding and joining at the
     * back. Re-offered once a frame, an object at the head of the queue
     * would never reach the front of it. */
    waitingFor(assigneeId: PhysicalId): RoleId | null {
        for (const assignment of this.#assignments) {
            if (
                assignment.assigneeId === assigneeId &&
                assignment.status === "queued"
            ) {
                return assignment.roleId;
            }
        }
        return null;
    }

    /* The object is gone for good, not merely lifted. Its part expires
       and the first thing waiting takes it. */
    departed(assigneeId: PhysicalId, at: number): void {
        for (const assignment of [...this.#assignments]) {
            if (assignment.assigneeId !== assigneeId) continue;
            if (
                assignment.status !== "active" &&
                assignment.status !== "queued"
            )
                continue;
            this.#replace(assignment, "expired");
            this.#promote(assignment.roleId, at);
        }
    }

    /* Close every assignment this object still holds or is waiting
       for, and let the queue move up behind it.
     *
     * The promotion is the half that was missing. A place vacated by an
     * object taking a different part is as open as one vacated by an
     * object leaving the table, and `departed` promoted while this did
     * not — so whether the queue moved depended on *why* the place came
     * free, which is not something anybody standing at the table could
     * have predicted. */
    #release(assigneeId: PhysicalId, at: number): void {
        const opened = new Set<RoleId>();
        for (const assignment of [...this.#assignments]) {
            if (assignment.assigneeId !== assigneeId) continue;
            if (
                assignment.status !== "active" &&
                assignment.status !== "queued"
            )
                continue;
            if (assignment.status === "active") opened.add(assignment.roleId);
            this.#replace(assignment, "removed");
        }
        for (const roleId of opened) this.#promote(roleId, at);
    }

    /* Move the first object waiting into the place that just opened. */
    #promote(roleId: RoleId, at: number): void {
        const role = this.roles.find((r) => r.id === roleId);
        if (role === undefined) return;
        const max = role.maximumAssignments;
        if (max !== undefined && this.active(roleId).length >= max) return;
        const waiting = this.#assignments.find(
            (a) =>
                a.roleId === roleId &&
                a.status === "queued" &&
                /* Somebody who is not already holding it. Without this
                   one object can be promoted into a second place while
                   the next in line never gets one. */
                this.roleOf(a.assigneeId) !== roleId,
        );
        if (waiting === undefined) return;
        this.#replace(waiting, "removed");
        this.#add(
            waiting.assigneeId,
            roleId,
            at,
            waiting.assignedBy,
            "active",
            /* Carried across, or being promoted would quietly reset how
               important the holder is and the next overflow would rank
               it wrongly. */
            waiting.priority ?? 0,
        );
    }

    #add(
        assigneeId: PhysicalId,
        roleId: RoleId,
        at: number,
        assignedBy: PhysicalId | null,
        status: RoleAssignment["status"],
        priority = 0,
    ): RoleAssignment {
        this.#nextId += 1;
        const assignment: RoleAssignment = {
            id: `assignment-${String(this.#nextId)}`,
            roleId,
            assigneeId,
            assignedAt: at,
            assignedBy,
            status,
            priority,
        };
        this.#assignments.push(assignment);
        return assignment;
    }

    /* Assignments are immutable records, so ending one means replacing
       it in place with a closed copy. The history stays readable: the
       log holds what was granted, this holds what is held now. */
    #replace(
        assignment: RoleAssignment,
        status: RoleAssignment["status"],
    ): void {
        const index = this.#assignments.indexOf(assignment);
        if (index < 0) return;
        this.#assignments[index] = { ...assignment, status };
    }

    clear(): void {
        this.#assignments.length = 0;
    }
}

/* How important this holder is, for the one overflow policy that
   ranks them.
 *
 * Read off the assignment, not off the role. Every candidate for a
 * place holds the same role by definition, so a priority taken from
 * the role is the same number for all of them — which made
 * `replaceLowestPriority` fall through to its tie-break every time and
 * behave exactly like `replaceOldest`, for every possible input. */
function priorityOf(assignment: RoleAssignment): number {
    return assignment.priority ?? 0;
}

function defaultResolvers(): readonly OverflowResolver[] {
    return [
        new RejectOverflow(),
        new QueueOverflow(),
        new ReplaceOldestOverflow(),
        new ReplaceLowestPriorityOverflow(),
        new AllowTemporarilyOverflow(),
    ];
}
