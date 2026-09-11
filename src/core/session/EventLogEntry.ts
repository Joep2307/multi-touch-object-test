import type { ActionId } from "../behaviour/ActionId";
import type { InteractionEvent } from "../events/InteractionEvent";
import type { ModeId } from "./ModeId";
import type { TransitionId } from "../behaviour/TransitionId";

/* One event, and what the table made of it.
 *
 * The mode is stamped on every entry, and that single field is what
 * makes five things possible with one structure: debugging, analytics,
 * replaying a session, undoing an action, and accounting afterwards
 * for how a vote came out. Without it, "this token was tapped" is a
 * fact with no context and none of the five work.
 *
 * `consumedBy` names the rules that acted on the event, so reading the
 * log back answers "why did that happen" as well as "what happened".
 * Empty means nothing fired, which is itself worth recording: most of
 * the events at a table are ones nothing reacted to.
 */
export type EventLogEntry = {
    readonly event: InteractionEvent;
    readonly modeId: ModeId | null;
    readonly consumedBy: readonly (ActionId | TransitionId)[];
};
