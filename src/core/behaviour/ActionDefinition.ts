import type { ExtensionProperties } from "../programme";
import type { ActionId } from "./ActionId";
import type { ConditionDefinition } from "./ConditionDefinition";
import type { EffectDefinition } from "./EffectDefinition";
import type { TriggerDefinition } from "./TriggerDefinition";

/* Something a programme can do, on its own.
 *
 * Free-standing behaviour: cast a vote, place a marker, change the
 * mode. The same three words as a transition — when, provided that,
 * then — and that duplication is deliberate rather than a missed
 * abstraction. Actions describe what a programme *can* do; states
 * describe when it is *allowed*. A token in `Voted` simply stops
 * listing `cast_vote` among its state's enabled actions, and neither
 * side has to know about the other.
 *
 * `priority` orders actions that match the same event. Equal priority
 * is definition order, so a programme that says nothing gets the order
 * it wrote, which is the only order anyone can predict by reading.
 */
export type ActionDefinition = {
    readonly id: ActionId;
    readonly name: string;
    readonly trigger: TriggerDefinition;
    readonly conditions: readonly ConditionDefinition[];
    readonly effects: readonly EffectDefinition[];
    readonly parameters?: Readonly<Record<string, unknown>>;
    readonly priority?: number;
    readonly properties?: ExtensionProperties;
};
