import type { ActionDefinition } from "./ActionDefinition";

/* The order actions are considered in.
 *
 * Higher priority first; equal priority keeps the order the programme
 * wrote them in. That second half is the important one: a programme
 * that says nothing about priority gets the order it can read off its
 * own file, which is the only order anyone can predict without running
 * the table.
 *
 * One function rather than a sort in each caller, because the rule
 * engine and the menu must agree. A menu that listed actions in a
 * different order from the one they fire in would be a menu that lies
 * about what a tap will do.
 */
export function byPriority(
    actions: readonly ActionDefinition[],
): readonly ActionDefinition[] {
    return [...actions]
        .map((action, index) => ({ action, index }))
        .sort(
            (a, b) =>
                (b.action.priority ?? 0) - (a.action.priority ?? 0) ||
                a.index - b.index,
        )
        .map((entry) => entry.action);
}
