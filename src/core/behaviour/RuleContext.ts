import type { EventDraft } from "../events";
import type {
    PhysicalAssignment,
    PhysicalId,
    PhysicalInstance,
    PhysicalKindDefinition,
} from "../physical";
import type { RelationKind } from "../relation";
import type { ModeId, RoleId } from "../session";
import type { ActionId } from "./ActionId";
import type { OutboxRequest } from "./OutboxRequest";

/* Everything a rule may read, and everything it may change.
 *
 * The seam between the behaviour layer and the session, written as an
 * interface so that phase C could be built and tested before phase D
 * existed — and so that a test can hand the engine a table of six
 * fields instead of a running session.
 *
 * It is wide because the seam is wide: a rule genuinely can ask about
 * a role, a mode, a variable, a distance and a region, and genuinely
 * can change a state, a mode, a variable and a timer. What it must not
 * be is *deep*. Every method here answers one question or performs one
 * change; none of them take a rule, an action or a condition, because
 * the moment the context knew about those the two halves of the seam
 * would be one thing again.
 */
export type RuleContext = {
    /* The frame clock. Never a wall clock, so a replay of a session
       produces the same rules firing at the same moments. */
    readonly at: number;
    readonly activeModeId: ModeId | null;

    /* Which actions this object may take: the active mode's list
       intersected with the list its own state allows.
     *
     * Both halves, because a state is what makes a second tap do
     * nothing — a token in `Voted` stops listing `cast_vote` — and an
     * engine that consulted only the mode would fire an action the
     * menu had already stopped offering. That disagreement is worse
     * than either rule alone.
     *
     * Null and empty are different answers: null means nothing is
     * narrowing anything, an empty set means everything is forbidden. */
    enabledActionIds(subjectId: string | null): ReadonlySet<ActionId> | null;

    instance(id: string): PhysicalInstance | null;
    /* Everything on the table this frame.
     *
     * Here for one reason: an event with no source is addressed to
     * every object, and a state machine cannot run such a transition
     * without knowing who "every object" is. A mode change, a
     * session-wide timer and a menu choice all arrive that way, and
     * before this they could not move a single token — the shipped
     * programme's `Voted → Ready` on `mode.changed` was simply dead.
     *
     * A copy, not the live collection: a rule that moves one object
     * must not change what the loop over the others is walking. */
    instances(): readonly PhysicalInstance[];
    kindOf(id: string): PhysicalKindDefinition | null;
    relationBetween(sourceId: string, targetId: string): RelationKind | null;
    distanceBetween(sourceId: string, targetId: string): number | null;
    regionsOf(id: string): readonly string[];

    variable(key: string): unknown;
    setVariable(key: string, value: unknown): void;
    assign(id: PhysicalId, change: PhysicalAssignment): void;

    /* Give an object a part, or take it away.
     *
     * Separate from `assign` because a role is not a field. It is held
     * in a ledger with a cap, an overflow policy and a list of kinds
     * allowed to play it, and writing `roleId` directly walks past all
     * three — two objects end up holding a part with a maximum of one,
     * and the ledger and the objects disagree about who has what. */
    assignRole(id: PhysicalId, roleId: RoleId | null): void;
    changeMode(id: ModeId): void;
    /* `sourceId` is who asked. Without it every `custom.timer.*`
       event arrives with no source, and an event with no source can
       never drive a state-machine transition or a filtered action —
       which is most of what anybody starts a timer for. */
    startTimer(name: string, afterMS: number, sourceId: string | null): void;
    publish(draft: EventDraft): void;
    request(request: OutboxRequest): void;
    appendToLog(
        note: string,
        payload: Readonly<Record<string, unknown>>,
    ): void;
};
