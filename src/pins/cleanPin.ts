import { randomId } from "../dom/randomId";
import type { Pin } from "../types/Pin";

/* Fill out a valid marker to the full shape: numbers as numbers,
   every text field a string, and an id and timestamp if missing.
   Expects a marker that has already passed `validPin`.

   `defaultTopic` is the topic for a marker without one — that depends on
   the language and on the knowledge graph, so only the caller knows it.
   `now` and `newId` are left open so a test doesn't have to depend on
   the clock. */
export function cleanPin(
    p: Record<string, unknown>,
    defaultTopic: string,
    {
        now = Date,
        newId = randomId,
    }: {
        now?: { new (): { toISOString(): string } };
        newId?: () => string;
    } = {},
): Pin {
    const text = (v: unknown): string => (typeof v === "string" ? v : "");
    const rawContact =
        p.contact && typeof p.contact === "object"
            ? (p.contact as Record<string, unknown>)
            : null;
    const contact =
        rawContact &&
        rawContact.consent === true &&
        (text(rawContact.email) || text(rawContact.phone))
            ? {
                  name: text(rawContact.name),
                  email: text(rawContact.email),
                  phone: text(rawContact.phone),
                  consent: true as const,
                  consentAt:
                      text(rawContact.consentAt) || new now().toISOString(),
              }
            : undefined;
    return {
        ...p,
        lat: +(p.lat as number | string),
        lng: +(p.lng as number | string),
        id: String(p.id || newId()),
        topic: text(p.topic) || defaultTopic,
        title: text(p.title),
        description: text(p.description) || text(p.note),
        note: text(p.note),
        transcript: text(p.transcript),
        contact,
        t:
            typeof p.t === "string" && p.t.length >= 16
                ? p.t
                : new now().toISOString(),
    } as Pin;
}
