import type { Vec2 } from "../base";
import type { ContactFrame } from "../contact";
import type { ContactEventPolicy } from "./ContactEventPolicy";
import type { EventBus } from "./EventBus";
import type { EventDraft } from "./EventDraft";

const NO_PROPERTIES = Object.freeze({});

/* Turns the raw glass into events.
 *
 * Below every object: a finger resting on the table is not a puck and
 * never will be, but a rule may still want to know it is there. The
 * frame already says which contacts are new and which have gone, so
 * this class adds only the one thing a frame cannot: whether an
 * ongoing touch actually moved.
 *
 * It keeps the last *announced* position rather than the last seen
 * one, so a touch creeping a pixel a frame eventually crosses the
 * floor and reports once, instead of never reporting because each step
 * was too small. Measuring from the last announcement is the
 * difference between a threshold and a filter that quietly loses
 * movement.
 */
export class ContactEventSource {
    readonly #announced = new Map<number, Vec2>();

    constructor(private readonly policy: ContactEventPolicy) {}

    update(frame: ContactFrame, bus: EventBus): void {
        for (const contact of frame.points) {
            const at: Vec2 = { x: contact.x, y: contact.y };
            if (contact.status === "started") {
                this.#announced.set(contact.id, at);
                bus.publish(this.#draft("contact.started", contact.id, frame));
                continue;
            }
            const was = this.#announced.get(contact.id);
            if (was === undefined) {
                this.#announced.set(contact.id, at);
                continue;
            }
            if (Math.hypot(at.x - was.x, at.y - was.y) < this.policy.minMovePX)
                continue;
            this.#announced.set(contact.id, at);
            bus.publish(this.#draft("contact.moved", contact.id, frame));
        }
        for (const contact of frame.ended) {
            this.#announced.delete(contact.id);
            bus.publish(this.#draft("contact.ended", contact.id, frame));
        }
    }

    #draft(
        type: "contact.started" | "contact.moved" | "contact.ended",
        id: number,
        frame: ContactFrame,
    ): EventDraft {
        const contact =
            frame.points.find((p) => p.id === id) ??
            frame.ended.find((p) => p.id === id);
        return {
            type,
            sourceId: `contact-${String(id)}`,
            targetId: null,
            timestamp: frame.at,
            payload: {
                x: contact?.x ?? 0,
                y: contact?.y ?? 0,
                radiusPX: contact?.radiusPX ?? 0,
            },
            properties: NO_PROPERTIES,
        };
    }

    reset(): void {
        this.#announced.clear();
    }
}
