import type { KindId } from "./KindId";
import type { PhysicalKindDefinition } from "./PhysicalKindDefinition";

/* Every kind the table knows about, including ones learned at the
   table itself.
 *
 * Registration refuses a duplicate id rather than overwriting. Two
 * kinds quietly sharing an id is the kind of fault that shows up as
 * one puck occasionally behaving like another — visible only at the
 * table, with the public present, and almost impossible to reproduce
 * afterwards.
 */
export class KindRegistry {
    readonly #kinds = new Map<KindId, PhysicalKindDefinition>();

    register(kind: PhysicalKindDefinition): void {
        if (this.#kinds.has(kind.id)) {
            throw new Error(`Kind "${kind.id}" is already registered.`);
        }
        this.#kinds.set(kind.id, kind);
    }

    /* The same kind, measured again.
     *
     * A different verb from `register`, deliberately. Refusing a
     * duplicate is right for definitions arriving at boot, where two
     * kinds sharing an id means the answer depends on load order. It
     * is wrong for a puck someone has just held up to the glass and
     * re-measured with "Learn puck": that genuinely redefines the
     * kind, and refusing it would leave the model reading the object
     * by the shape it used to have.
     *
     * The definition it replaces is left untouched rather than
     * mutated, so anything still holding the old one can tell by
     * identity that it is holding the old one. That is what lets a
     * caller decide to rebuild whatever it built on the old shape —
     * `TrackBridge` does exactly that with the base of a puck whose
     * footprint has just changed under it.
     */
    redefine(kind: PhysicalKindDefinition): void {
        this.#kinds.set(kind.id, kind);
    }

    get(id: KindId): PhysicalKindDefinition | null {
        return this.#kinds.get(id) ?? null;
    }

    all(): readonly PhysicalKindDefinition[] {
        return [...this.#kinds.values()];
    }

    /* The kinds still being made, as opposed to the ones only kept
       working. Nothing is ever removed for being legacy. */
    current(): readonly PhysicalKindDefinition[] {
        return this.all().filter((k) => !k.legacy);
    }

    clear(): void {
        this.#kinds.clear();
    }
}
