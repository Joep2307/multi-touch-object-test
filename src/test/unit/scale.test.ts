/* The table measuring its own screen.
 *
 * What is guarded here is not the arithmetic -- a weighted average needs
 * no test -- but the four ways this can go wrong on a table with people
 * around it: a scale that follows nonsense, a scale that confirms itself
 * from a puck that was measured with it, a scale that a resize throws
 * away, and a scale that never moves because the gate is too tight.
 *
 * The last test replays a real recording. Those seven files are the
 * reason this exists: the declared 43 in screen behaves like 42 in, and
 * the table should be able to work that out on its own.
 */
import { SCALE } from "../../config";
import { observeScale, readScale, syncPxPerMM } from "../../puck/scale";
import { scale, view } from "../../state";
import { beforeEach, describe as suite, expect, it } from "vitest";
import type { RingShape, Shape, Template } from "../../types";
import fixture from "./core/fixtures/contacts-table-19-18529.json";

/* A 43 in screen at 1920x1080, which is what the table declares. */
const SEED = Math.hypot(1920, 1080) / (43 * 25.4);

/* The rim centre line: where the feet of every printed puck stand. */
const FEET_MM = 34;

const ring = (radius: number): RingShape => ({
    ring: true,
    cx: 0,
    cy: 0,
    radius,
    spread: 0,
    angles: [],
    gaps: [],
});

const triad = (longest: number): Shape => ({
    ring: false,
    ratios: [0.68, 0.91],
    longest,
    anchor: { x: 0, y: 0 },
    chir: 1,
    cx: 0,
    cy: 0,
});

const tpl = (extra: Partial<Template> = {}): Template => ({
    id: "puck-01",
    verdict: "good",
    angles: [54, 124, 206, 250, 306],
    ringMM: FEET_MM,
    ...extra,
});

/* One reading, repeated until the weighted average has settled. */
const settle = (px: number, mm: number, conf = 1, times = 600): void => {
    for (let i = 0; i < times; i++) observeScale({ px, mm, conf });
};

suite("the screen scale", () => {
    beforeEach(() => {
        scale.seed = SEED;
        scale.k = 1;
        scale.samples = 0;
        syncPxPerMM();
    });

    it("starts at what the declared screen size implies", () => {
        expect(view.pxPerMM).toBeCloseTo(SEED, 9);
        expect(scale.k).toBe(1);
    });

    it("corrects itself towards what a puck measures", () => {
        /* A 34 mm feet circle read as 70.11 px is 2.06 px/mm, where the
           declared screen says 2.02: the table is 2.2 % out. */
        settle(70.11, FEET_MM);
        expect(scale.k).toBeCloseTo(70.11 / FEET_MM / SEED, 4);
        expect(view.pxPerMM).toBeCloseTo(70.11 / FEET_MM, 4);
    });

    it("moves in small steps, so one bad frame changes nothing much", () => {
        observeScale({ px: 70.11, mm: FEET_MM, conf: 1 });
        const step = Math.abs(scale.k - 1);
        expect(step).toBeGreaterThan(0);
        expect(step).toBeLessThan(SCALE.smoothing);
    });

    it("cannot be talked past the clamp, however long the nonsense", () => {
        settle(700, FEET_MM, 1, 5000);
        expect(scale.k).toBeCloseTo(1 + SCALE.maxDrift, 9);
        settle(7, FEET_MM, 1, 5000);
        expect(scale.k).toBeCloseTo(1 - SCALE.maxDrift, 9);
        /* Even at the clamp the scale is a scale, not a wild number. */
        expect(view.pxPerMM).toBeCloseTo(SEED * (1 - SCALE.maxDrift), 9);
    });

    it("ignores a shape it is not sure of", () => {
        settle(70.11, FEET_MM, SCALE.minConf - 0.01);
        expect(scale.k).toBe(1);
        expect(scale.samples).toBe(0);
    });

    it("keeps the correction when the window changes size", () => {
        settle(70.11, FEET_MM);
        const learned = scale.k;
        /* The same screen, half the window: the seed halves, what the
           pucks measured about this panel does not. */
        scale.seed = SEED / 2;
        syncPxPerMM();
        expect(scale.k).toBe(learned);
        expect(view.pxPerMM).toBeCloseTo((SEED / 2) * learned, 9);
    });
});

suite("which puck may act as a ruler", () => {
    it("reads a ring from its feet circle", () => {
        expect(readScale(tpl(), ring(70.11), 1)).toEqual({
            px: 70.11,
            mm: FEET_MM,
            conf: 1,
        });
    });

    it("reads a triangle from its longest side", () => {
        const t = tpl({ angles: undefined, ringMM: undefined, longestMM: 62 });
        expect(readScale(t, triad(128), 1)?.mm).toBe(62);
    });

    it("refuses a puck that was learned at the table", () => {
        const learned = tpl({ learnedAt: "2026-09-09T07:36:55.143Z" });
        expect(readScale(learned, ring(70.11), 1)).toBeNull();
        /* The duo measures itself the moment it is seen, which is the
           same circularity by another route. */
        expect(readScale(tpl({ duoSeen: true }), ring(70.11), 1)).toBeNull();
    });

    it("refuses a known length too short to measure a screen with", () => {
        const small = tpl({
            angles: undefined,
            ringMM: undefined,
            longestMM: SCALE.minMM - 1,
        });
        expect(readScale(small, triad(20), 1)).toBeNull();
    });

    it("refuses a measurement that is not a measurement", () => {
        expect(readScale(tpl(), ring(0), 1)).toBeNull();
        expect(readScale(tpl(), ring(NaN), 1)).toBeNull();
    });
});

suite("against a real recording", () => {
    /* table-19: a puck standing still on the glass. Its three feet fix
       one circle, and that circle is the 34 mm rim centre line. */
    const circum = (p: number[][]): number | null => {
        const [a, b, c] = p as [number[], number[], number[]];
        const [ax, ay] = a as [number, number],
            [bx, by] = b as [number, number],
            [cx, cy] = c as [number, number];
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        if (Math.abs(d) < 1e-9) return null;
        const sa = ax * ax + ay * ay,
            sb = bx * bx + by * by,
            sc = cx * cx + cy * cy;
        const ux = (sa * (by - cy) + sb * (cy - ay) + sc * (ay - by)) / d,
            uy = (sa * (cx - bx) + sb * (ax - cx) + sc * (bx - ax)) / d;
        return Math.hypot(ax - ux, ay - uy);
    };

    const radii = (): number[] => {
        const out: number[] = [];
        for (const f of fixture.frames) {
            if (f.points.length !== 3) continue;
            const pts = f.points.map((q) => [q.x, q.y]);
            const r = circum(pts);
            if (r !== null && r > 45 && r < 110) out.push(r);
        }
        return out;
    };

    it("works out that the declared screen is about 2 % too big", () => {
        const measured = radii();
        expect(measured.length).toBeGreaterThan(100);
        scale.seed = SEED;
        scale.k = 1;
        scale.samples = 0;
        syncPxPerMM();
        for (const r of measured) {
            observeScale({ px: r, mm: FEET_MM, conf: 1 });
        }
        /* Read by hand off the same recording: 2.06 px/mm against the
           2.0169 the declared 43 in implies. */
        expect(view.pxPerMM).toBeGreaterThan(2.04);
        expect(view.pxPerMM).toBeLessThan(2.08);
        expect(scale.k).toBeGreaterThan(1.015);
        expect(scale.k).toBeLessThan(1.035);
        /* And it stayed well inside the guard while doing it. */
        expect(scale.k).toBeLessThan(1 + SCALE.maxDrift);
    });
});
