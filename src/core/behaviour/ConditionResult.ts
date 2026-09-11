import type { ConditionDefinition } from "./ConditionDefinition";

/* Whether a condition held, and if not, which one did not.
 *
 * The reason is the whole point. "I tapped it and nothing happened" is
 * the most common thing anyone says at a table with visitors, and
 * without the condition that refused, answering it means reading the
 * programme file and guessing. With it, the overlay can say *state is
 * Voted, not Ready* and the conversation is over.
 *
 * Carrying the definition rather than a message keeps the reason
 * translatable and machine-readable: the log stores it, the overlay
 * renders it, and neither has to parse English.
 */
export type ConditionResult =
    | { readonly met: true }
    | { readonly met: false; readonly refused: ConditionDefinition };
