import type { PresentationId } from "../presentation";
import type { ExtensionProperties } from "../programme";
import type { ActionId } from "./ActionId";
import type { EffectDefinition } from "./EffectDefinition";
import type { StateId } from "./StateId";

/* One position an object, role or mode can be in.
 *
 * `enabledActionIds` is where a state does its real work. It is not a
 * list of what the state *does* — it is the list of what is possible
 * while in it, and a token that has voted stops listing `cast_vote`.
 * That single line is why a second tap does nothing, and why nothing
 * had to be written to make a second tap do nothing.
 *
 * Entry and exit effects run on the way in and out. They are separate
 * from the transition's own effects because they belong to the state
 * rather than to any one route into it: every way of arriving at
 * `Voted` should light the same lamp.
 */
export type StateDefinition = {
    readonly id: StateId;
    readonly name: string;
    readonly presentationId?: PresentationId;
    readonly enabledActionIds: readonly ActionId[];
    readonly entryEffects: readonly EffectDefinition[];
    readonly exitEffects: readonly EffectDefinition[];
    readonly properties?: ExtensionProperties;
};
