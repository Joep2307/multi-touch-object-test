/* The grid code: a puck is the pattern of which slots carry a foot.
 *
 * What is verified here is what the code has to survive at the table: the
 * puck lies anywhere and at any angle, a foot trembles or briefly loses
 * contact, a hand rests on the same circle -- and the answer still has to
 * be the same puck, or none, but never the wrong one.
 */
import { CFG, SLOT_CODES } from "../../config";
import {
    codeDistance,
    codeSelfSym,
    codeSlots,
    describeSlots,
    matchSlots,
    padsFor,
    popCount,
    rotateCode,
    sizeErr,
    wrapAngle,
} from "../../puck/geometry";
import { describe as suite, expect, it } from "vitest";
import { at } from "./at";
import type { Point, Template } from "../../types";

const N = SLOT_CODES.slots;
const PX_PER_MM = 4; // roughly a 43 inch screen
const tpl = (code: number, mm = 34): Template => ({
    id: `grid-${code}-${mm}`,
    verdict: "good",
    slots: N,
    code,
    ringMM: mm,
});
const PUCKS = SLOT_CODES.codes.map((c) => tpl(c));

/** A puck on the glass: its pads, turned by `rot` and laid down at x,y. */
const lay = (t: Template, rot: number, x = 500, y = 400): Point[] =>
    padsFor(t, PX_PER_MM).map((p) => ({
        x: x + p.x * Math.cos(rot) - p.y * Math.sin(rot),
        y: y + p.x * Math.sin(rot) + p.y * Math.cos(rot),
    }));

/** Turn one foot a few degrees around the centre — a trembling contact. */
const nudge = (pts: Point[], i: number, deg: number, cx = 500, cy = 400) =>
    pts.map((p, j) => {
        if (j !== i) return p;
        const a = Math.atan2(p.y - cy, p.x - cx) + (deg * Math.PI) / 180,
            r = Math.hypot(p.x - cx, p.y - cy);
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });

const read = (pts: Point[]) => describeSlots(pts, N)!;
const best = (pts: Point[], list = PUCKS) =>
    list
        .map((t) => ({ t, m: matchSlots(read(pts), t) }))
        .sort((a, b) => a.m.err - b.m.err);

/* The winner and the runner-up. `best` ranks a list that always holds
   more than one puck, which the compiler cannot see from here. */
const topTwo = (pts: Point[], list = PUCKS) => {
    const [win, second] = best(pts, list);
    if (!win || !second) throw new Error("fewer than two pucks to rank");
    return { win, second };
};

suite("the printed codes", () => {
    it("all have six feet", () => {
        for (const c of SLOT_CODES.codes) expect(popCount(c)).toBe(6);
    });
    it("do not look like themselves when turned", () => {
        for (const c of SLOT_CODES.codes)
            expect(codeSelfSym(c, N)).toBeGreaterThanOrEqual(4);
    });
    it("lie four slots apart, so one mistake is never enough", () => {
        for (let i = 0; i < SLOT_CODES.codes.length; i++)
            for (let j = i + 1; j < SLOT_CODES.codes.length; j++)
                expect(
                    codeDistance(
                        at(SLOT_CODES.codes, i),
                        at(SLOT_CODES.codes, j),
                        N,
                    ),
                ).toBeGreaterThanOrEqual(4);
    });
    it("start with the anchor 0, 1, 3", () => {
        for (const c of SLOT_CODES.codes)
            expect(codeSlots(c, N).slice(0, 3)).toEqual([0, 1, 3]);
    });
});

suite("rotateCode", () => {
    it("comes back to itself after a full turn", () => {
        expect(rotateCode(459, N, N)).toBe(459);
    });
    it("keeps the number of feet", () => {
        for (let k = 0; k < N; k++)
            expect(popCount(rotateCode(2219, N, k))).toBe(6);
    });
});

suite("a puck on the glass", () => {
    it("keeps its code wherever it lies and however it is turned", () => {
        for (const t of PUCKS)
            for (const deg of [0, 17, 90, 143, 250, 359]) {
                const rot = (deg * Math.PI) / 180;
                const { win, second } = topTwo(
                    lay(t, rot, 300 + deg, 700 - deg),
                );
                expect(win.t.id).toBe(t.id);
                expect(win.m.err).toBe(0);
                expect(second.m.err - win.m.err).toBeGreaterThanOrEqual(2);
            }
    });
    it("reports the angle it was turned by", () => {
        for (const deg of [0, 17, 90, 143, 250]) {
            const rot = (deg * Math.PI) / 180;
            const m = matchSlots(read(lay(at(PUCKS, 0), rot)), at(PUCKS, 0));
            expect(Math.abs(wrapAngle(m.angle - rot))).toBeLessThan(0.02);
        }
    });
    it("survives a foot that trembles half a slot", () => {
        const pts = nudge(nudge(lay(at(PUCKS, 2), 0.7), 1, 9), 4, -9);
        const { win } = topTwo(pts);
        expect(win.t.id).toBe(at(PUCKS, 2).id);
        expect(win.m.err).toBe(0);
    });
    it("survives a foot that loses contact", () => {
        for (const t of PUCKS) {
            const pts = lay(t, 1.2).filter((_, i) => i !== 2);
            const { win, second } = topTwo(pts);
            expect(win.t.id).toBe(t.id);
            expect(win.m.miss).toBe(1);
            expect(second.m.err - win.m.err).toBeGreaterThanOrEqual(2);
        }
    });
    it("survives a finger resting on the same circle", () => {
        const t = at(PUCKS, 0),
            R = 34 * PX_PER_MM,
            a = (2 * 30 * Math.PI) / 180; // slot 2, which is empty
        const pts = [
            ...lay(t, 0),
            { x: 500 + R * Math.cos(a), y: 400 + R * Math.sin(a) },
        ];
        const { win } = topTwo(pts);
        expect(win.t.id).toBe(t.id);
        expect(win.m.extra).toBe(1);
    });
});

suite("what must not happen", () => {
    it("never names another puck", () => {
        for (const t of PUCKS) {
            const others = PUCKS.filter((o) => o !== t);
            for (const o of others)
                expect(matchSlots(read(lay(t, 0.4)), o).err).toBeGreaterThan(
                    2,
                );
        }
    });
    it("does not accept a handful of fingers as a puck", () => {
        /* Six fingers spread around a circle do snap to the grid often
         enough -- what keeps them out is that a reading with as many feet
         as a code differs in an even number of slots. So a complete
         reading has to be exact, and two off is already too much. */
        const rnd = [0, 41, 96, 155, 212, 300].map((deg) => {
            const a = (deg * Math.PI) / 180,
                r = 34 * PX_PER_MM;
            return { x: 500 + r * Math.cos(a), y: 400 + r * Math.sin(a) };
        });
        const { win } = topTwo(rnd);
        expect(win.m.err).toBeGreaterThan(CFG.slotErrMax);
    });
    it("is exact or clearly wrong when all the feet are there", () => {
        for (const t of PUCKS)
            for (const o of PUCKS) {
                const err = matchSlots(read(lay(t, 0.4)), o).err;
                expect(err === 0 || err >= 4).toBe(true);
            }
    });
    it("keeps the same code on two rings apart", () => {
        const small = tpl(at(SLOT_CODES.codes, 0), 26);
        const pts = lay(small, 0.9);
        const d = read(pts);
        expect(sizeErr(d.radius, 26, PX_PER_MM)).toBeLessThan(0.02);
        expect(sizeErr(d.radius, 34, PX_PER_MM)).toBeGreaterThan(0.18);
        /* The code itself cannot tell them apart -- that is what the ring
         is for. */
        expect(matchSlots(d, tpl(at(SLOT_CODES.codes, 0), 34)).err).toBe(0);
    });
});
