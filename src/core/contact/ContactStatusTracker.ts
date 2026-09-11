import type { ContactFrame } from "./ContactFrame";
import type { ContactPoint } from "./ContactPoint";
import type { SensedContact } from "./SensedContact";

/* The one place that decides whether a touch is new, continuing or
   gone.
 *
 * It works by keeping the previous frame and nothing else, which is
 * exactly the bookkeeping every consumer would otherwise have to keep
 * for itself. Six copies of it is six chances to be a frame out of
 * step with the others, and that class of disagreement is invisible
 * until a puck flickers.
 *
 * A lifted contact is announced once, in the frame's `ended` list,
 * with the coordinates it had when it was last seen. Once, because it
 * is an announcement rather than a state: a consumer that misses it was
 * not looking, and repeating it would make every stale touch look live.
 * In its own list, because a lifted foot among the live ones is a foot
 * still on the glass to anything that counts them.
 *
 * `lastSeen` on an ended contact is deliberately left where it was.
 * The touch stopped when the driver stopped reporting it, not when the
 * frame that noticed happened to run, and moving it forward would add
 * a frame of imaginary dwell to every tap.
 */
export class ContactStatusTracker {
    #was = new Map<number, ContactPoint>();

    apply(at: number, live: readonly SensedContact[]): ContactFrame {
        const next = new Map<number, ContactPoint>();
        const points: ContactPoint[] = [];
        for (const sensed of live) {
            const point: ContactPoint = {
                ...sensed,
                status: this.#was.has(sensed.id) ? "active" : "started",
            };
            next.set(point.id, point);
            points.push(point);
        }
        const ended: ContactPoint[] = [];
        for (const [id, was] of this.#was) {
            if (next.has(id)) continue;
            ended.push({ ...was, status: "ended" });
        }
        this.#was = next;
        points.sort((a, b) => a.id - b.id);
        ended.sort((a, b) => a.id - b.id);
        return { at, points, ended };
    }

    reset(): void {
        this.#was = new Map<number, ContactPoint>();
    }
}
