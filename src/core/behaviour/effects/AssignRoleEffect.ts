import { EffectExecutor } from "../EffectExecutor";
import { targetOf } from "./targetOf";
import type { PhysicalId } from "../../physical";
import type { RoleId } from "../../session";
import type { EffectDefinition } from "../EffectDefinition";
import type { RuleContext } from "../RuleContext";

/* Give an object a part to play, or take it away.
 *
 * Through `assignRole` and never by writing `roleId`. A role is not a
 * field on an object: it is held in a ledger with a cap, an overflow
 * policy and a list of kinds allowed to play it. Setting the field
 * directly walks past all three, so a role with a maximum of one ends
 * up held by two objects and the ledger no longer describes the table.
 * This effect wrote the field directly until a review caught it.
 *
 * `null` clears the role rather than omitting the field, because "this
 * object now has no role" and "leave its role alone" are different
 * instructions and a rule has to be able to say either.
 */
export class AssignRoleEffect extends EffectExecutor {
    override readonly id = "assignRole" as const;

    override run(
        definition: EffectDefinition,
        subjectId: string | null,
        context: RuleContext,
    ): void {
        if (definition.type !== "assignRole") return;
        const id = targetOf(definition.target, subjectId);
        if (id === null) return;
        context.assignRole(
            id as PhysicalId,
            definition.roleId === null ? null : (definition.roleId as RoleId),
        );
    }
}
