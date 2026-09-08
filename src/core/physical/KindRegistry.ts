import type { KindId } from "./KindId";
import type { PhysicalKind } from "./PhysicalKind";

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
    readonly #kinds = new Map<KindId, PhysicalKind>();

    register(kind: PhysicalKind): void {
        if (this.#kinds.has(kind.id)) {
            throw new Error(`Kind "${kind.id}" is already registered.`);
        }
        this.#kinds.set(kind.id, kind);
    }

    get(id: KindId): PhysicalKind | null {
        return this.#kinds.get(id) ?? null;
    }

    all(): readonly PhysicalKind[] {
        return [...this.#kinds.values()];
    }

    /* The kinds still being made, as opposed to the ones only kept
       working. Nothing is ever removed for being legacy. */
    current(): readonly PhysicalKind[] {
        return this.all().filter((k) => !k.legacy);
    }

    clear(): void {
        this.#kinds.clear();
    }
}
