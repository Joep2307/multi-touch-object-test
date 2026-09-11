import type { BindingTarget } from "./BindingTarget";

/* One drawn property, and where it reads from.
 *
 * `source` is a path into what the table knows: `pose.position`,
 * `pose.direction`, `currentState`, `activeMode`,
 * `variables.voteCount`, `properties.anything`. A short closed
 * vocabulary of prefixes rather than a general expression, for the
 * same reason conditions have no `and`: a data file nobody can debug
 * is worse than one that cannot say everything.
 *
 * `map` turns a value into another value — a state id into a colour,
 * a mode into whether something is visible. Without it every
 * programme would need a rule per state whose only effect was to
 * change a colour, and the presentation layer would be back in the
 * behaviour layer where it started.
 */
export type Binding = {
    readonly target: BindingTarget;
    readonly source: string;
    readonly map?: Readonly<Record<string, unknown>>;
    /* Used when the source resolves to nothing, or to something the
       map has no entry for. */
    readonly fallback?: unknown;
};
