/* Which state machine a kind, role or mode runs.
 *
 * Separate from `StateId` because they are separate things and get
 * confused constantly: a machine is the set of states and the
 * transitions between them, a state is one position in it.
 */
export type StateMachineId = string & { readonly __brand: "StateMachineId" };
