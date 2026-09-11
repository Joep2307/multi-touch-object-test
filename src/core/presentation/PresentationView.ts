/* The little of the session a drawing is allowed to see.
 *
 * Three things: the clock, the mode, and the variables. Not the
 * instances, not the rules, not the log. The presentation layer may
 * not import from `session/` at all — the lint rule says so — and this
 * type is why it does not need to: a `Session` satisfies it by
 * accident of shape, and a test satisfies it with four lines.
 *
 * Keeping it this small is the enforcement. A binding that could reach
 * the whole session would eventually reach a rule, and the one
 * guarantee this layer makes is that no arrow runs from here back into
 * behaviour.
 */
export type PresentationView = {
    readonly at: number;
    readonly activeModeId: string | null;
    variable(key: string): unknown;
};
