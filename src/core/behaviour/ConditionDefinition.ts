import type { ConditionOperator } from "./ConditionOperator";
import type { ConditionSubjectType } from "./ConditionSubjectType";

/* One thing that has to be true.
 *
 * The middle word of the grammar: *when* something happens,
 * **provided that** this holds, *then* do that. Four fields and no
 * nesting — no `and`, no `or`, no parentheses. A rule with several
 * conditions has them all hold, and a rule that needs an `or` is two
 * rules. That is a real limit and it is chosen: an expression tree in
 * a JSON file is a small programming language, and a small programming
 * language in a data file is one nobody can debug.
 *
 * `type` says where to look, `subject` says what to look at within it,
 * `operator` and `value` say what must be true of it. Only some types
 * use `subject`: `variable` needs the name of one, `role` does not
 * because there is only one role.
 *
 * The model's list has `region` doing two jobs — "is this inside that
 * object" and "is this standing in that area" — so they are split
 * here. `relation` answers the first, `region` the second.
 */
export type ConditionDefinition = {
    readonly type: ConditionSubjectType;
    readonly subject?: string;
    readonly operator: ConditionOperator;
    readonly value: unknown;
};
