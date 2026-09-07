/* The geometry behind puck recognition — the Rust crate, via wasm.
 *
 * What's being verified here is the promise the whole table rests on: a
 * puck keeps the same side ratios, wherever it lies and however it's
 * rotated. If that breaks, the table stops recognising anything, and you
 * only notice with an audience around it. The crate has its own `cargo test`
 * (`npm run wasm:test`); this file checks whether the built .wasm and the
 * TypeScript side still understand each other.
 */
import { beforeAll, describe as suite, expect, it } from "vitest";
import { describe } from "../../puck/geometry/describe";
import { dist } from "../../puck/geometry/dist";
import { padsFor } from "../../puck/geometry/padsFor";
import { wrapAngle } from "../../puck/geometry/wrapAngle";
import type { Point } from "../../types/Point";
import type { Template } from "../../types/Template";
import { loadWasmForTest } from "./loadWasmForTest";

/** The four pucks from the blueprint, as they appear in TPL_FACTORY. */
const TEMPLATES: Template[] = [
    { id: "puck-01", ratios: [0.62, 0.81], verdict: "good" },
    { id: "puck-02", ratios: [0.48, 0.76], verdict: "bad" },
    { id: "puck-03", ratios: [0.7, 0.93], verdict: "talk" },
    { id: "puck-04", ratios: [0.85, 0.9], verdict: "idea" },
];

/** Rotate a point around the origin — a puck on the table rarely lies straight. */
const rotate = (p: Point, a: number): Point => ({
    x: p.x * Math.cos(a) - p.y * Math.sin(a),
    y: p.x * Math.sin(a) + p.y * Math.cos(a),
});
const move = (p: Point, dx: number, dy: number): Point => ({
    x: p.x + dx,
    y: p.y + dy,
});
const tri = (pts: Point[]) => describe(pts[0], pts[1], pts[2])!;

beforeAll(loadWasmForTest);

suite("dist", () => {
    it("meet de rechte afstand", () => {
        expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });
});

suite("padsFor", () => {
    it("legt de driehoek met zijn zwaartepunt in de oorsprong", () => {
        for (const tpl of TEMPLATES) {
            const pts = padsFor(tpl, 60);
            expect(pts).toHaveLength(3);
            expect(pts.reduce((s, p) => s + p.x, 0) / 3).toBeCloseTo(0, 10);
            expect(pts.reduce((s, p) => s + p.y, 0) / 3).toBeCloseTo(0, 10);
        }
    });

    it("bouwt precies de zijden die het sjabloon voorschrijft", () => {
        for (const tpl of TEMPLATES) {
            const L = 60;
            const [a, b, c] = padsFor(tpl, L);
            const zijden = [dist(a, b), dist(b, c), dist(c, a)].sort(
                (x, y) => x - y,
            );
            expect(zijden[2]).toBeCloseTo(L, 9);
            expect(zijden[0] / zijden[2]).toBeCloseTo(
                Math.min(...tpl.ratios),
                9,
            );
            expect(zijden[1] / zijden[2]).toBeCloseTo(
                Math.max(...tpl.ratios),
                9,
            );
        }
    });

    it("schaalt mee met de langste zijde", () => {
        const klein = padsFor(TEMPLATES[0], 30);
        const groot = padsFor(TEMPLATES[0], 60);
        klein.forEach((p, i) => {
            expect(groot[i].x).toBeCloseTo(p.x * 2, 9);
            expect(groot[i].y).toBeCloseTo(p.y * 2, 9);
        });
    });
});

suite("describe", () => {
    it("leest van elk sjabloon zijn eigen verhoudingen terug", () => {
        for (const tpl of TEMPLATES) {
            const d = tri(padsFor(tpl, 60));
            expect(d.ratios[0]).toBeCloseTo(Math.min(...tpl.ratios), 9);
            expect(d.ratios[1]).toBeCloseTo(Math.max(...tpl.ratios), 9);
            expect(d.longest).toBeCloseTo(60, 9);
        }
    });

    it("houdt dezelfde verhoudingen als de puck draait en verschuift", () => {
        const tpl = TEMPLATES[1];
        const recht = tri(padsFor(tpl, 60));
        for (const hoek of [0.3, 1.1, Math.PI / 2, 2.9, 5.5]) {
            const d = tri(
                padsFor(tpl, 60).map((p) => move(rotate(p, hoek), 431, -87)),
            );
            expect(d.ratios[0]).toBeCloseTo(recht.ratios[0], 9);
            expect(d.ratios[1]).toBeCloseTo(recht.ratios[1], 9);
            expect(d.longest).toBeCloseTo(recht.longest, 9);
        }
    });

    it("meldt het zwaartepunt waar de puck ligt", () => {
        const d = tri(padsFor(TEMPLATES[0], 60).map((p) => move(p, 800, 500)));
        expect(d.cx).toBeCloseTo(800, 9);
        expect(d.cy).toBeCloseTo(500, 9);
    });

    it("wijst het anker aan tegenover de langste zijde", () => {
        // Right triangle 3-4-5: the longest side lies between (0,0)
        // and (4,3), so the anchor is the third point.
        const p1 = { x: 0, y: 0 },
            p2 = { x: 4, y: 3 },
            p3 = { x: 3, y: 0 };
        const d = describe(p1, p2, p3)!;
        expect(d.longest).toBeCloseTo(5, 9);
        expect(d.anchor).toEqual(p3);
    });

    it("geeft de hoek terug waarin het anker staat", () => {
        const tpl = TEMPLATES[2];
        const recht = tri(padsFor(tpl, 60));
        const nul = Math.atan2(
            recht.anchor.y - recht.cy,
            recht.anchor.x - recht.cx,
        );
        for (const hoek of [0, 0.7, 2.2, -1.4]) {
            const d = tri(padsFor(tpl, 60).map((p) => rotate(p, hoek)));
            const gemeten = Math.atan2(d.anchor.y - d.cy, d.anchor.x - d.cx);
            expect(wrapAngle(gemeten - nul - hoek)).toBeCloseTo(0, 9);
        }
    });

    it("onderscheidt een puck van zijn spiegelbeeld", () => {
        const pts = padsFor(TEMPLATES[0], 60);
        const gespiegeld = pts.map((p) => ({ x: -p.x, y: p.y }));
        expect(tri(pts).chir).not.toBe(tri(gespiegeld).chir);
    });

    it("houdt de draairichting vast terwijl de puck ronddraait", () => {
        const tpl = TEMPLATES[3];
        const chir = tri(padsFor(tpl, 60)).chir;
        for (let hoek = 0; hoek < 2 * Math.PI; hoek += 0.4) {
            expect(
                tri(padsFor(tpl, 60).map((p) => rotate(p, hoek))).chir,
            ).toBe(chir);
        }
    });

    it("weigert drie punten die vrijwel samenvallen", () => {
        expect(
            describe(
                { x: 100, y: 100 },
                { x: 100.2, y: 100 },
                { x: 100, y: 100.3 },
            ),
        ).toBeNull();
    });

    it("houdt de vier sjablonen ruim uit elkaar", () => {
        // This is why recognition works with tolerance 0.10: every template
        // lies further than that tolerance from every other. Anyone
        // designing a fifth puck must get this test passing again.
        for (const a of TEMPLATES) {
            const d = tri(padsFor(a, 60));
            for (const b of TEMPLATES) {
                if (a.id === b.id) continue;
                expect(
                    Math.hypot(
                        d.ratios[0] - b.ratios[0],
                        d.ratios[1] - b.ratios[1],
                    ),
                ).toBeGreaterThan(0.1);
            }
        }
    });
});

suite("wrapAngle", () => {
    it("neemt de kortste weg", () => {
        expect(wrapAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI * 0.5, 9);
        expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI * 0.5, 9);
        expect(wrapAngle(0.3)).toBeCloseTo(0.3, 9);
    });
});
