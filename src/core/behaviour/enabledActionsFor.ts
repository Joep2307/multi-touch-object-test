import { byPriority } from "./byPriority";
import type { ActionDefinition } from "./ActionDefinition";
import type { ActionId } from "./ActionId";
import type { PhysicalInstance } from "../physical/PhysicalInstance";
import type { StateDefinition } from "./StateDefinition";

/* What this object can be asked to do, right now.
 *
 * The whole of the ring menu, as a question about definitions. The
 * plan called this a `MenuComposer`; it is named for what it computes
 * instead, because a menu is one consumer of the answer and an overlay
 * explaining why a tap did nothing is another.
 *
 * This is what lets the hard rule hold: **no file that draws anything
 * names a role id.** Today `ringItems()` decides what a puck offers by
 * asking what kind of puck it is. It should ask what its holder is
 * allowed to do, and this is the question.
 *
 * Three filters, and they are the same three the rule engine applies,
 * in the same order — a menu that offered an action the engine would
 * refuse would be worse than no menu at all:
 *
 *   the state   an object in `Voted` no longer lists `cast_vote`
 *   the mode    a mode narrows and never widens
 *   the trigger an action written for voting tokens is not offered on
 *               a control dial
 *
 * A `null` state means the object runs no state machine, which is not
 * the same as being in a state that allows nothing. A `null` mode set
 * means no mode is narrowing anything. Both are absences rather than
 * empty sets, and the difference is the whole reason they are
 * nullable.
 */
export function enabledActionsFor(
    instance: PhysicalInstance,
    actions: readonly ActionDefinition[],
    state: StateDefinition | null,
    modeAllows: ReadonlySet<ActionId> | null,
): readonly ActionDefinition[] {
    const byState =
        state === null ? null : new Set<ActionId>(state.enabledActionIds);
    return byPriority(
        actions.filter(
            (action) =>
                (byState === null || byState.has(action.id)) &&
                (modeAllows === null || modeAllows.has(action.id)) &&
                aimedAt(action, instance),
        ),
    );
}

/* Would this action's trigger even look at this object? One string
   covers its id, its kind and its part, because that is how a
   programme thinks — "when a voting token is tapped" and "when *this*
   puck is tapped" are the same sentence with a different noun. */
function aimedAt(
    action: ActionDefinition,
    instance: PhysicalInstance,
): boolean {
    const filter = action.trigger.sourceFilter;
    return (
        filter === undefined ||
        filter === instance.id ||
        filter === instance.kindId ||
        filter === instance.roleId
    );
}
