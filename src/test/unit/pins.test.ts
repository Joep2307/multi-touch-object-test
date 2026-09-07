/* What's allowed to come back out of storage.
 *
 * The render loop runs on every marker that `restore()` returns. One
 * marker with an unknown verdict made `vColor()` throw, which brought the
 * whole table to a halt — pucks, ring menu, everything — on every single
 * frame. This file keeps that door shut.
 */
import { describe, expect, it } from "vitest";
import { randomId } from "../../dom/randomId";
import { cleanPin } from "../../pins/cleanPin";
import { validPin } from "../../pins/validPin";

const KEYS = new Set(["good", "bad", "talk", "idea"]);
const geldig = (
    extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
    id: "p1",
    verdict: "good",
    lat: 51.5866,
    lng: 4.7759,
    ...extra,
});

describe("validPin", () => {
    it("laat een gewone markering door", () => {
        expect(validPin(geldig(), KEYS)).toBe(true);
    });

    it("gebruikt zonder tweede argument de oordelen van de tafel", () => {
        expect(validPin(geldig())).toBe(true);
        expect(validPin(geldig({ verdict: "onzin" }))).toBe(false);
    });

    it("neemt coördinaten die als tekst zijn opgeslagen", () => {
        expect(validPin(geldig({ lat: "51.5866", lng: "4.7759" }), KEYS)).toBe(
            true,
        );
    });

    it("weigert een oordeel dat de tafel niet kent", () => {
        expect(validPin(geldig({ verdict: "onzin" }), KEYS)).toBe(false);
        expect(validPin(geldig({ verdict: undefined }), KEYS)).toBe(false);
    });

    it("weigert coördinaten die geen getal zijn", () => {
        expect(validPin(geldig({ lat: "geen getal" }), KEYS)).toBe(false);
        expect(validPin(geldig({ lng: NaN }), KEYS)).toBe(false);
        expect(validPin(geldig({ lat: Infinity }), KEYS)).toBe(false);
        expect(validPin(geldig({ lng: undefined }), KEYS)).toBe(false);
    });

    it("weigert leegte die zich als nul voordoet", () => {
        // `+null`, `+""`, `+[]` and `+false` are all 0. A marker with
        // `lat: null` ended up as a valid point in the Gulf of Guinea
        // because of that, instead of being discarded.
        for (const leeg of [null, "", "   ", [], false]) {
            expect(validPin(geldig({ lat: leeg }), KEYS)).toBe(false);
            expect(validPin(geldig({ lng: leeg }), KEYS)).toBe(false);
        }
    });

    it("weigert wat helemaal geen markering is", () => {
        for (const rommel of [
            null,
            undefined,
            0,
            "",
            "puck",
            [],
            [geldig()],
        ]) {
            expect(validPin(rommel, KEYS)).toBe(false);
        }
    });

    it("houdt een halve sessie tegen zonder zelf te gooien", () => {
        const opgeslagen = [
            geldig({ id: "goed-1" }),
            geldig({ id: "kapot-1", verdict: "onzin" }),
            geldig({ id: "kapot-2", lat: "geen getal" }),
            null,
        ];
        const over = opgeslagen.filter((p) => validPin(p, KEYS)) as Record<
            string,
            unknown
        >[];
        expect(over.map((p) => p.id)).toEqual(["goed-1"]);
    });
});

describe("cleanPin", () => {
    it("maakt getallen van coördinaten die als tekst binnenkwamen", () => {
        const p = cleanPin(geldig({ lat: "51.5866", lng: "4.7759" }), "Wonen");
        expect(p.lat).toBe(51.5866);
        expect(p.lng).toBe(4.7759);
    });

    it("vult elk tekstveld, ook als het ontbreekt", () => {
        const p = cleanPin(geldig(), "Wonen");
        for (const veld of [
            "title",
            "description",
            "note",
            "transcript",
            "topic",
        ] as const) {
            expect(typeof p[veld]).toBe("string");
        }
    });

    it("gooit tekstvelden weg die geen tekst zijn", () => {
        const p = cleanPin(geldig({ title: 42, note: { a: 1 } }), "Wonen");
        expect(p.title).toBe("");
        expect(p.note).toBe("");
    });

    it("neemt een oude `note` over als er nog geen toelichting is", () => {
        const p = cleanPin(geldig({ note: "van vroeger" }), "Wonen");
        expect(p.description).toBe("van vroeger");
        expect(p.note).toBe("van vroeger");
    });

    it("laat een bestaande toelichting met rust", () => {
        const p = cleanPin(
            geldig({ description: "nu", note: "van vroeger" }),
            "Wonen",
        );
        expect(p.description).toBe("nu");
    });

    it("valt terug op het meegegeven thema", () => {
        expect(cleanPin(geldig(), "Wonen").topic).toBe("Wonen");
        expect(cleanPin(geldig({ topic: "Verkeer" }), "Wonen").topic).toBe(
            "Verkeer",
        );
    });

    it("verzint een id voor een markering zonder id", () => {
        const p = cleanPin(geldig({ id: undefined }), "Wonen", {
            newId: () => "verzonnen",
        });
        expect(p.id).toBe("verzonnen");
    });

    it("houdt een bestaand id vast, ook als het een getal was", () => {
        expect(cleanPin(geldig({ id: 17 }), "Wonen").id).toBe("17");
    });

    it("zet er een tijdstip op als dat ontbreekt of onbruikbaar is", () => {
        const klok = class {
            toISOString() {
                return "2026-01-01T12:00:00.000Z";
            }
        };
        for (const t of [undefined, "", "gisteren", 12345]) {
            const p = cleanPin(geldig({ t }), "Wonen", { now: klok });
            expect(p.t).toBe("2026-01-01T12:00:00.000Z");
        }
    });

    it("laat een geldig tijdstip staan", () => {
        const t = "2025-09-04T10:11:12.000Z";
        expect(cleanPin(geldig({ t }), "Wonen").t).toBe(t);
    });

    it("bewaart velden die het niet kent", () => {
        const p = cleanPin(geldig({ eigenVeld: "blijft" }), "Wonen");
        expect(p.eigenVeld).toBe("blijft");
    });

    it("laat wat er al doorheen kwam ongemoeid bij een tweede beurt", () => {
        const een = cleanPin(
            geldig({ t: "2025-09-04T10:11:12.000Z" }),
            "Wonen",
        );
        expect(cleanPin(een, "Wonen")).toEqual(een);
    });
});

describe("randomId", () => {
    it("geeft elke keer iets anders", () => {
        const ids = new Set(Array.from({ length: 200 }, randomId));
        expect(ids.size).toBeGreaterThan(190);
    });
});
