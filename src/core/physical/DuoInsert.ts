import { Puck } from "./Puck";
import type { DuoHost } from "./DuoHost";

/* The inner half of the duo: the tool that nests into a host.
 *
 * **Not a role.** While nested it adds or swaps functions on its
 * host, and takes them away again when separated — a modifier, not an
 * identity. The alternative was giving the insert a role of its own,
 * which sounds simpler until you notice every other role then needs a
 * duo variant of itself.
 *
 * That split keeps two different kinds of fact apart: "two discs may
 * lie on each other" is physical and lives on the `Nestable`
 * affordance, while "this puck may now edit every path" is a
 * permission and will live in the function set. Neither has to know
 * about the other.
 */
export class DuoInsert extends Puck {
    #host: DuoHost | null = null;

    get host(): DuoHost | null {
        return this.#host;
    }

    get isNested(): boolean {
        return this.#host !== null;
    }

    nestInto(host: DuoHost): void {
        this.#host = host;
        host.accept(this);
    }

    separate(): void {
        this.#host?.release();
        this.#host = null;
    }
}
