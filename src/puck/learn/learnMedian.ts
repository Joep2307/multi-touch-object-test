import { learn } from "../../state/learn";
import type { DuoSample } from "../../types/DuoSample";
import type { LearnMeasure } from "../../types/LearnMeasure";
import type { RingSample } from "../../types/RingSample";
import type { TriSample } from "../../types/TriSample";
import { norm360 } from "../geometry/norm360";

/* The median over the series. For a triangle that goes number by number.
   For a ring it must first be settled which foot is which: the first frame
   is the measure and every next frame is turned so it fits that best.
   Without that the order jumps as soon as a foot trembles past the arrow,
   and you measure a puck that isn't there. The adding up happens in
   differences relative to that first frame, so 359 and 1 stay neighbours. */
export function learnMedian(): LearnMeasure {
    const S = learn.samples;
    const med = (f: (s: never) => number): number => {
        const a = S.map(f as (s: unknown) => number).sort((x, y) => x - y);
        return a[a.length >> 1];
    };
    const size = med(((s: { size: number }) => s.size) as never);
    if ((S[0] as DuoSample).duo) {
        const d = (f: (s: DuoSample) => number): number =>
            med(f as unknown as (s: never) => number);
        return {
            duo: true,
            o: {
                r0: d((s) => s.o0),
                r1: d((s) => s.o1),
                longest: d((s) => s.osize),
            },
            i: {
                r0: d((s) => s.i0),
                r1: d((s) => s.i1),
                longest: d((s) => s.isize),
            },
        };
    }
    if (!(S[0] as RingSample).ring) {
        const t = (f: (s: TriSample) => number): number =>
            med(f as unknown as (s: never) => number);
        return {
            ring: false,
            r0: t((s) => s.r0),
            r1: t((s) => s.r1),
            longest: size,
        };
    }
    const base = (S[0] as RingSample).angles,
        wrap = (a: number): number => ((((a + 180) % 360) + 360) % 360) - 180;
    const cols: number[][] = [[], [], [], [], []];
    for (const sm of S as RingSample[]) {
        let bs = 0,
            bErr = Infinity;
        for (let k = 0; k < 5; k++) {
            let e = 0;
            for (let i = 0; i < 5; i++)
                e += Math.abs(wrap(sm.angles[(i + k) % 5] - base[i]));
            if (e < bErr) {
                bErr = e;
                bs = k;
            }
        }
        for (let i = 0; i < 5; i++)
            cols[i].push(base[i] + wrap(sm.angles[(i + bs) % 5] - base[i]));
    }
    const angles = cols.map((c) => {
        c.sort((x, y) => x - y);
        return norm360(c[c.length >> 1]);
    });
    return { ring: true, angles: angles.sort((a, b) => a - b), radius: size };
}
