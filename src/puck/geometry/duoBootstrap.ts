import { view } from "../../state/view";
import type { PuckCandidate } from "../../types/PuckCandidate";
import type { Shape } from "../../types/Shape";
import type { Template } from "../../types/Template";
import type { TouchPoint } from "../../types/TouchPoint";
import { isToolPuck } from "../isToolPuck";
import type { DuoSplit } from "./splitDuo";
import { splitDuo } from "./splitDuo";

/* ── The duo without measuring ────────────────────────────────────
   The two halves are ordinary triangles and are recognised by the triangle
   loop -- as soon as their measurements are right. Before "Learn puck"
   those are still the values of the build drawing, and those are a guess.

   This back door bridges that. It doesn't look at ratios but at the shape
   of the pair: a big and a small triangle around the same centre is the duo
   and nothing else. What it measures it writes straight into the templates,
   so that the ordinary loop can follow the two separately afterwards --
   also when you pull them apart. Nothing goes to disk: this is a nudge, not
   a measurement.

   As soon as the duo has really been learned (`learnedAt`) this door is
   closed. Then the templates are better than anything it could derive.

   It searches at most eight points: with the duo on an otherwise empty
   glass there are six, and one loose finger must not break it. More than
   that is a table where something else is going on -- learn it first. */
export function duoBootstrap(
    points: TouchPoint[],
    list: Template[],
): PuckCandidate[] {
    const duo = list.filter((t) => t.nest);
    if (duo.length !== 2 || duo.some((t) => t.learnedAt)) return [];
    if (points.length < 6 || points.length > 8) return [];
    const outer = duo.find((t) => !isToolPuck(t)),
        inner = duo.find((t) => isToolPuck(t));
    if (!outer || !inner) return [];
    /* One slot, so the recursion has somewhere to leave its best find
     without the compiler losing track of the type. */
    const found: (DuoSplit & { idx: number[] })[] = [];
    const choose = (start: number, cur: number[]): void => {
        if (cur.length === 6) {
            const six = cur.map((i) => points[i]).filter((p) => !!p);
            if (six.length !== 6) return;
            const split = splitDuo(six);
            if (split && (!found[0] || split.score < found[0].score))
                found[0] = { ...split, idx: [...cur] };
            return;
        }
        for (let i = start; i < points.length; i++) {
            cur.push(i);
            choose(i + 1, cur);
            cur.pop();
        }
    };
    choose(0, []);
    const best = found[0];
    if (!best) return [];
    /* What it sees becomes the measurement straight away, so the ordinary
     loop takes over. */
    const set = (tpl: Template, d: Shape): void => {
        tpl.ratios = [d.ratios[0], d.ratios[1]];
        tpl.longestMM = d.longest / view.pxPerMM;
        tpl.duoSeen = true;
        delete tpl.angles;
        delete tpl.ringMM;
    };
    set(outer, best.big);
    set(inner, best.small);
    /* `splitDuo` counts within the six; back to the numbers of the glass. */
    const real = (g: number[]): number[] => g.map((i) => best.idx[i] ?? 0);
    const cand = (tpl: Template, d: Shape, idx: number[]): PuckCandidate => ({
        tpl,
        errN: 0,
        idx,
        d,
        conf: 0.8,
    });
    return [
        cand(outer, best.big, real(best.bi)),
        cand(inner, best.small, real(best.si)),
    ];
}
