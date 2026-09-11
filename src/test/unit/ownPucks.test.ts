/* Pucks learned at the puck stand, across a reload.
 *
 * `saveOwnPucks` wrote only the triangle fields, and `restoreOwnPucks`
 * refused any entry without a two-element `ratios`. So a puck learned as
 * a ring or as a grid code was saved without the numbers that said what
 * it was and dropped on the next reload -- and `ownSeq` was not advanced
 * either, so the next puck learned took an id that was already on the
 * shelf. `saveTemplates` describes fixing this same bug for the four from
 * the blueprint; this is the other list.
 */
import { afterEach, beforeEach, describe as suite, expect, it } from "vitest";
import { restoreOwnPucks, saveOwnPucks } from "../../puck";
import { templates } from "../../state";
import type { Template } from "../../types";

const TRIANGLE: Template = {
    id: "own-01",
    verdict: "good",
    ratios: [0.62, 0.81],
    longestMM: 61.4,
    learnedAt: "2026-09-11T08:00:00.000Z",
    own: true,
};
const RING: Template = {
    id: "own-02",
    verdict: "bad",
    angles: [54, 124, 206, 250, 306],
    ringMM: 34.2,
    learnedAt: "2026-09-11T08:01:00.000Z",
    own: true,
};
const GRID: Template = {
    id: "own-03",
    verdict: "talk",
    slots: 12,
    code: 1453,
    ringMM: 33.8,
    learnedAt: "2026-09-11T08:02:00.000Z",
    own: true,
};

/* A localStorage that only this test can see. The real one is not
   available under Node, and a test that wrote to a real one would leave
   the next run's table holding pucks nobody put there. */
const store = new Map<string, string>();
const fake = {
    getItem: (k: string): string | null => store.get(k) ?? null,
    setItem: (k: string, v: string): void => void store.set(k, v),
    removeItem: (k: string): void => void store.delete(k),
    clear: (): void => store.clear(),
    key: (): string | null => null,
    length: 0,
};

const saved = { own: templates.own, ownSeq: templates.ownSeq };

beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = fake;
    templates.own = [];
    templates.ownSeq = 0;
});

afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    templates.own = saved.own;
    templates.ownSeq = saved.ownSeq;
    store.clear();
});

/* Save what is on the shelf, clear it, and read it back. */
const reload = (): void => {
    saveOwnPucks();
    templates.own = [];
    templates.ownSeq = 0;
    restoreOwnPucks();
};

suite("own pucks across a reload", () => {
    it("keeps a triangle", () => {
        templates.own = [{ ...TRIANGLE }];
        reload();
        expect(templates.own).toHaveLength(1);
        const back = templates.own[0];
        expect(back?.ratios).toEqual(TRIANGLE.ratios);
        expect(back?.longestMM).toBe(TRIANGLE.longestMM);
        expect(back?.learnedAt).toBe(TRIANGLE.learnedAt);
        expect(back?.own).toBe(true);
    });

    it("keeps a ring", () => {
        templates.own = [{ ...RING }];
        reload();
        expect(templates.own).toHaveLength(1);
        const back = templates.own[0];
        expect(back?.angles).toEqual(RING.angles);
        expect(back?.ringMM).toBe(RING.ringMM);
        /* And nothing of the shape it is not. Two descriptions of one
           puck is what `applyShape` exists to prevent. */
        expect(back?.ratios).toBeUndefined();
    });

    it("keeps a grid code", () => {
        templates.own = [{ ...GRID }];
        reload();
        expect(templates.own).toHaveLength(1);
        const back = templates.own[0];
        expect(back?.slots).toBe(GRID.slots);
        expect(back?.code).toBe(GRID.code);
        expect(back?.ringMM).toBe(GRID.ringMM);
        expect(back?.ratios).toBeUndefined();
        expect(back?.angles).toBeUndefined();
    });

    it("keeps all three at once, and the shelf number with them", () => {
        templates.own = [{ ...TRIANGLE }, { ...RING }, { ...GRID }];
        templates.ownSeq = 3;
        reload();
        expect(templates.own.map((t) => t.id)).toEqual([
            "own-01",
            "own-02",
            "own-03",
        ]);
        /* Without this the next puck learned would be called `own-01`
           again, and two different pucks would answer to one name. */
        expect(templates.ownSeq).toBe(3);
    });

    it("refuses a record that is no shape at all", () => {
        templates.own = [{ id: "own-01", verdict: "good", own: true }];
        reload();
        expect(templates.own).toHaveLength(0);
    });

    it("refuses a verdict the table does not know", () => {
        templates.own = [
            { ...TRIANGLE, verdict: "nonsense" as Template["verdict"] },
        ];
        reload();
        expect(templates.own).toHaveLength(0);
    });
});
