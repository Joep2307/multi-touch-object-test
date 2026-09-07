/* The knowledge graph, to the extent it can be verified without a backend.
 *
 * src/kg talks to coco-biblio, but most of what the table shows of it in
 * the note window is just computation over `kg.nodes`: what's nearby, how
 * far that is, and the question that follows from it. That part should be
 * verifiable without any Rust server running anywhere. The network is
 * never touched: none of the functions below load the graph.
 */
import { afterEach, describe, expect, it } from "vitest";
import { buildQuestion } from "../../kg/buildQuestion";
import { formatDistance } from "../../kg/formatDistance";
import { kg } from "../../kg/kg";
import { kgDescribe } from "../../kg/kgDescribe";
import { nearby } from "../../kg/nearby";
import { setKgLang } from "../../kg/setKgLang";
import type { KgNode } from "../../types/KgNode";

/* A handful of nodes around the Grote Kerk in Breda. The distances are
   chosen so they clearly fall inside or outside the default radius of
   1500 m — this test measures the ordering, not the earth's radius. */
const KERK = { lat: 51.5886, lon: 4.7757 };
/* Meters northward, on the same sphere metersBetween calculates on (R = 6371 km). */
const M_PER_GRAAD = (6371000 * Math.PI) / 180;
const opNoord = (m: number, rest: Partial<KgNode>): KgNode => ({
    id: "n",
    type: "entity",
    label: "",
    etype: "",
    year: null,
    lat: KERK.lat + m / M_PER_GRAAD,
    lon: KERK.lon,
    themes: [],
    ...rest,
});

afterEach(() => {
    kg.nodes = [];
    setKgLang("nl");
});

describe("formatDistance", () => {
    it("rondt meters af op tientallen", () => {
        expect(formatDistance(0)).toBe("0 m");
        expect(formatDistance(4)).toBe("0 m");
        expect(formatDistance(123)).toBe("120 m");
        expect(formatDistance(999)).toBe("1000 m");
    });

    it("gaat vanaf een kilometer over op kilometers", () => {
        expect(formatDistance(1000)).toBe("1.0 km");
        expect(formatDistance(2540)).toBe("2.5 km");
    });
});

describe("nearby", () => {
    it("geeft de dichtstbijzijnde knopen eerst", () => {
        kg.nodes = [
            opNoord(900, { id: "ver", label: "Ver" }),
            opNoord(100, { id: "dichtbij", label: "Dichtbij" }),
            opNoord(400, { id: "midden", label: "Midden" }),
        ];
        expect(nearby(KERK.lat, KERK.lon).map((x) => x.node.id)).toEqual([
            "dichtbij",
            "midden",
            "ver",
        ]);
    });

    it("meet de afstand die het teruggeeft", () => {
        kg.nodes = [opNoord(500, { id: "a" })];
        expect(nearby(KERK.lat, KERK.lon)[0].dist).toBeCloseTo(500, 0);
    });

    it("laat wat buiten de straal ligt weg", () => {
        kg.nodes = [
            opNoord(200, { id: "binnen" }),
            opNoord(9000, { id: "ver" }),
        ];
        expect(nearby(KERK.lat, KERK.lon).map((r) => r.node.id)).toEqual([
            "binnen",
        ]);
    });

    it("houdt zich aan de gevraagde straal en het aantal", () => {
        kg.nodes = [100, 200, 300, 400].map((m, i) =>
            opNoord(m, { id: "n" + i }),
        );
        expect(nearby(KERK.lat, KERK.lon, { radiusM: 250 })).toHaveLength(2);
        expect(nearby(KERK.lat, KERK.lon, { limit: 1 })).toHaveLength(1);
    });

    it("tilt een passend thema omhoog zonder de rest weg te gooien", () => {
        kg.nodes = [
            opNoord(100, { id: "dichtbij", themes: ["Groen"] }),
            opNoord(300, { id: "passend", themes: ["Verkeer"] }),
        ];
        expect(nearby(KERK.lat, KERK.lon)[0].node.id).toBe("dichtbij");
        // 300 m − 250 m bonus < 100 m: the matching topic wins.
        const met = nearby(KERK.lat, KERK.lon, { theme: "verkeer" });
        expect(met[0].node.id).toBe("passend");
        expect(met[0].match).toBe(true);
        expect(met).toHaveLength(2);
    });

    it("trekt zich niets aan van hoofdletters of spaties in het thema", () => {
        kg.nodes = [opNoord(300, { id: "passend", themes: ["Verkeer"] })];
        expect(
            nearby(KERK.lat, KERK.lon, { theme: "  VERKEER " })[0].match,
        ).toBe(true);
    });

    it("geeft niets terug als de graaf leeg is", () => {
        kg.nodes = [];
        expect(nearby(KERK.lat, KERK.lon)).toEqual([]);
    });
});

describe("kgDescribe", () => {
    it("noemt soort, type en jaar", () => {
        expect(
            kgDescribe({ type: "document", etype: "beleid", year: 2019 }),
        ).toBe("document · beleid · 2019");
    });

    it("laat weg wat er niet is", () => {
        expect(kgDescribe({ type: "document" })).toBe("document");
    });
});

describe("buildQuestion", () => {
    const basis = {
        title: "Kapotte stoeptegel",
        description: "Al maanden",
        topic: "Openbare ruimte",
        verdictName: "Probleem",
        place: "de Haagdijk",
        near: [],
    };

    it("zet neer wat er gezegd is, waar en onder welk thema", () => {
        const q = buildQuestion(basis);
        expect(q).toContain("de Haagdijk");
        expect(q).toContain("Kapotte stoeptegel — Al maanden");
        expect(q).toContain("Openbare ruimte");
        expect(q).toContain("Probleem");
    });

    it("noemt alleen documenten uit de buurt, met hun afstand", () => {
        const q = buildQuestion({
            ...basis,
            near: [
                {
                    node: opNoord(0, {
                        type: "document",
                        label: "Mobiliteitsvisie",
                    }),
                    dist: 240,
                },
                {
                    node: opNoord(0, { type: "entity", label: "Grote Kerk" }),
                    dist: 80,
                },
            ],
        });
        expect(q).toContain('"Mobiliteitsvisie" (240 m)');
        expect(q).not.toContain("Grote Kerk");
    });

    it("laat de documentenzin weg als er niets in de buurt ligt", () => {
        expect(buildQuestion(basis)).not.toContain("Documenten in de directe");
    });

    it("vult in dat er niets is toegelicht", () => {
        expect(
            buildQuestion({ ...basis, title: "", description: "" }),
        ).toContain("(geen toelichting gegeven)");
    });

    it("volgt de taal van de tafel", () => {
        setKgLang("en");
        const q = buildQuestion({ ...basis, title: "", description: "" });
        expect(q).toContain("At a participation table in Breda");
        expect(q).toContain("(no explanation given)");
    });
});
