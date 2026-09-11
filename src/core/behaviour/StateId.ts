/* Which state a physical, role or mode is in.
 *
 * Branded so that a state id and a kind id cannot be swapped by
 * accident: both are strings read out of the same programme file, and
 * the compiler is the only reader that will ever notice.
 *
 * This folder is otherwise phase C's. The id lands early because
 * `PhysicalKindDefinition` and `PhysicalInstance` already have to name
 * a state, and a placeholder `string` there would have to be widened
 * out of every call site later.
 */
export type StateId = string & { readonly __brand: "StateId" };
