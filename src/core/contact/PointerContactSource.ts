import { ContactSource } from "./ContactSource";
import type { ContactFrame } from "./ContactFrame";
import type { ContactPoint } from "./ContactPoint";

/* Real touches on the glass.
 *
 * This class holds the live set and nothing else. The
 * `addEventListener` work lives in an adapter outside the core, which
 * calls `down` / `move` / `up` — that is what keeps the core free of
 * the DOM, and what lets a test drive a five-foot puck across the
 * table in four lines with no browser anywhere.
 *
 * `move` on an id that is not down is treated as a `down`. That is not
 * defensiveness for its own sake: the table has a reset that clears
 * everything while fingers are still on the glass, and the browser
 * quite reasonably keeps sending moves for them. Dropping those would
 * strand a contact until it was lifted and put back.
 */
export class PointerContactSource extends ContactSource {
    readonly #live = new Map<number, ContactPoint>();

    down(
        id: number,
        x: number,
        y: number,
        radiusPX: number,
        at: number,
    ): void {
        this.#live.set(id, {
            id,
            x,
            y,
            radiusPX,
            firstSeen: at,
            lastSeen: at,
        });
    }

    move(
        id: number,
        x: number,
        y: number,
        radiusPX: number,
        at: number,
    ): void {
        const was = this.#live.get(id);
        if (was === undefined) {
            this.down(id, x, y, radiusPX, at);
            return;
        }
        this.#live.set(id, {
            id,
            x,
            y,
            radiusPX,
            firstSeen: was.firstSeen,
            lastSeen: at,
        });
    }

    up(id: number): void {
        this.#live.delete(id);
    }

    override frame(now: number): ContactFrame {
        const points = [...this.#live.values()].sort((a, b) => a.id - b.id);
        return { at: now, points };
    }

    override clear(): void {
        this.#live.clear();
    }
}
