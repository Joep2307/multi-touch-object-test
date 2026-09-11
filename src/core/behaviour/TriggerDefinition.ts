import type { EventType } from "../events/EventType";

/* When a rule is considered at all.
 *
 * The first word of the grammar. Deliberately coarse: an event type
 * and two filters, and nothing about the state of the table. Anything
 * finer is a condition — the split is what lets the engine find the
 * handful of rules worth evaluating by looking at the event alone,
 * rather than evaluating every rule on every event.
 *
 * The filters match against a kind id, a role id or a physical id, so
 * one rule can be written for every voting token without naming any of
 * them. Absent means any.
 */
export type TriggerDefinition = {
    readonly eventType: EventType;
    readonly sourceFilter?: string;
    readonly targetFilter?: string;
    readonly parameters?: Readonly<Record<string, unknown>>;
};
