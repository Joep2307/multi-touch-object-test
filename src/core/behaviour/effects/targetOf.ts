/* Which object an effect is aimed at.
 *
 * `"self"` is the physical the event came from, and it is the answer
 * almost every rule wants: a token that was tapped changes its own
 * state. Written as a word rather than left implicit so that a rule
 * aimed at something else looks different from one aimed at itself,
 * instead of the difference being an absent field.
 */
export function targetOf(
    target: string,
    subjectId: string | null,
): string | null {
    return target === "self" ? subjectId : target;
}
