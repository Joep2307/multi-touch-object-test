import type { StateDefinition } from "./StateDefinition";
import type { StateId } from "./StateId";
import type { StateMachineId } from "./StateMachineId";
import type { TransitionDefinition } from "./TransitionDefinition";

/* A set of states and the ways between them.
 *
 * Owned by a kind, a role or a mode — the runner does not care which,
 * because a state machine has no opinion about what is in it. That is
 * what lets a programme give the *session* a machine (Setup → Voting →
 * Results) with the same three words as it gives a token.
 *
 * `states` is non-empty by type for the same reason a kind's
 * signatures are: a machine with no states is not a machine, and
 * saying so here means no reader has to handle the empty case and no
 * validator has to catch it.
 */
export type StateMachineDefinition = {
    readonly id: StateMachineId;
    readonly name: string;
    readonly initialStateId: StateId;
    readonly states: readonly [StateDefinition, ...StateDefinition[]];
    readonly transitions: readonly TransitionDefinition[];
};
