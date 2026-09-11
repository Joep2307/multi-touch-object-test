import { learn } from "../../state/learn";
import type { DuoSample } from "../../types/DuoSample";
import type { LearnMeasure } from "../../types/LearnMeasure";
import type { RingSample } from "../../types/RingSample";
import type { SlotSample } from "../../types/SlotSample";
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
    /* De middelste van een gesorteerde rij. Nul als er niets is
       gemeten -- dat is geen meting om overheen te lezen, maar er is
       ook geen betere waarde te bedenken, en de aanroeper heeft al
       gecontroleerd dat er monsters zijn. */
    const med = (f: (s: never) => number): number => {
        const a = S.map(f as (s: unknown) => number).sort((x, y) => x - y);
        return a[a.length >> 1] ?? 0;
    };
    const size = med(((s: { size: number }) => s.size) as never);
    /* A grid puck has no numbers to average: a slot is occupied or it
     isn't. So a majority vote per slot -- a foot that loses contact for
     three frames out of fifty doesn't change the code. */
    if ((S[0] as SlotSample).slot) {
        const n = (S[0] as SlotSample).slots;
        let code = 0;
        for (let i = 0; i < n; i++) {
            let c = 0;
            for (const sm of S as SlotSample[]) if ((sm.code >>> i) & 1) c++;
            if (c * 2 > S.length) code |= 1 << i;
        }
        return { slot: true, slots: n, code, radius: size };
    }
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
                e += Math.abs(
                    wrap((sm.angles[(i + k) % 5] ?? 0) - (base[i] ?? 0)),
                );
            if (e < bErr) {
                bErr = e;
                bs = k;
            }
        }
        for (let i = 0; i < 5; i++) {
            const column = cols[i];
            const from = base[i];
            if (!column || from === undefined) continue;
            column.push(from + wrap((sm.angles[(i + bs) % 5] ?? 0) - from));
        }
    }
    const angles = cols.map((c) => {
        c.sort((x, y) => x - y);
        return norm360(c[c.length >> 1] ?? 0);
    });
    return { ring: true, angles: angles.sort((a, b) => a - b), radius: size };
}
