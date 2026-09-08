import type { Physical } from "./Physical";
import type { PhysicalId } from "./PhysicalId";
import type { PresenceState } from "./PresenceState";
import type { RegistryEvent } from "./RegistryEvent";

type Listener = (event: RegistryEvent) => void;

/* Everything the table currently believes exists.
 *
 * Announces changes rather than being polled, so that nothing has to
 * scan the whole set every frame looking for what altered. The events
 * are derived from `Presence`, in one place, which is what stops six
 * different features each keeping their own idea of whether a puck is
 * still there.
 *
 * A physical that goes `gone` is dropped. Anything that needs to
 * outlive it — what it authored, what it did — belongs in the session
 * record, not here: this is the live set, not the history.
 */
export class PhysicalRegistry {
    readonly #live = new Map<PhysicalId, Physical>();
    readonly #was = new Map<PhysicalId, PresenceState>();
    readonly #listeners = new Set<Listener>();

    add(physical: Physical): void {
        if (this.#live.has(physical.id)) return;
        this.#live.set(physical.id, physical);
        this.#was.set(physical.id, physical.presence.state);
        this.#emit({ type: "joined", physical });
    }

    get(id: PhysicalId): Physical | null {
        return this.#live.get(id) ?? null;
    }

    all(): readonly Physical[] {
        return [...this.#live.values()];
    }

    /* Those that could still come back as themselves: on the glass, or
       lifted and within the memory window. */
    recoverable(): readonly Physical[] {
        return this.all().filter((p) => p.presence.recoverable);
    }

    /* Turn this frame's presence states into events, and forget what
       is gone. Call once per frame, after the physicals have been
       updated. */
    sweep(): void {
        for (const physical of [...this.#live.values()]) {
            const now = physical.presence.state;
            const before = this.#was.get(physical.id);
            if (before === now) continue;
            this.#was.set(physical.id, now);
            if (now === "lifted") {
                this.#emit({ type: "lifted", physical });
            } else if (now === "placed" && before === "lifted") {
                this.#emit({ type: "returned", physical });
            } else if (now === "gone") {
                this.#live.delete(physical.id);
                this.#was.delete(physical.id);
                this.#emit({ type: "left", physical });
            }
        }
    }

    subscribe(listener: Listener): () => void {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }

    #emit(event: RegistryEvent): void {
        for (const listener of this.#listeners) listener(event);
    }

    clear(): void {
        this.#live.clear();
        this.#was.clear();
    }
}
