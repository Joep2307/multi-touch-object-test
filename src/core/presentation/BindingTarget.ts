/* Which property of a drawing a binding writes.
 *
 * A closed list on purpose. A binding that could write any property
 * would be a small programming language in a data file, and the point
 * of the presentation layer is that it has no logic in it at all —
 * position follows a pose, colour follows a state, and neither knows
 * why the state changed.
 */
export type BindingTarget =
    | "position"
    | "rotation"
    | "text"
    | "color"
    | "visible"
    | "scale"
    | "opacity";
