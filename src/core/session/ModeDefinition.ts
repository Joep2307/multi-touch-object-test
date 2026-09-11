import type { ActionId } from "../behaviour/ActionId";
import type { EffectDefinition } from "../behaviour/EffectDefinition";
import type { ExtensionProperties } from "../programme/ExtensionProperties";
import type { KindId } from "../physical/KindId";
import type { ModeId } from "./ModeId";
import type { PresentationId } from "../presentation/PresentationId";
import type { RoleId } from "./RoleId";
import type { StateId } from "../behaviour/StateId";

/* What the table is doing right now.
 *
 * A mode temporarily trims the rest: which actions exist, which roles
 * take part, which table image applies. The same table with the same
 * objects behaves differently in Voting than in Discussion, and none
 * of the objects had to change.
 *
 * **A mode narrows, never widens.** "Everyone votes now" means the
 * mode denies everything except `cast_vote`; only objects whose role
 * already grants it can then vote. A mode can never hand out something
 * a role did not give, which is what keeps the effective permission a
 * pure intersection — and therefore checkable at boot instead of
 * discovered at four in the afternoon.
 *
 * `initialStateAssignments` maps a kind to the state its objects start
 * in when the mode begins. That is how entering Voting puts every
 * token back to `Ready` without a rule per kind.
 */
export type ModeDefinition = {
    readonly id: ModeId;
    readonly name: string;
    readonly tablePresentationId?: PresentationId;
    readonly enabledActionIds: readonly ActionId[];
    readonly enabledRoleIds: readonly RoleId[];
    readonly initialStateAssignments?: Readonly<Record<KindId, StateId>>;
    readonly entryEffects: readonly EffectDefinition[];
    readonly exitEffects: readonly EffectDefinition[];
    readonly properties?: ExtensionProperties;
};
