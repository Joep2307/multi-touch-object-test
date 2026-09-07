import { learn } from "../../state/learn";
import { touches } from "../../state/touches";
import type { TouchPoint } from "../../types/TouchPoint";
import { recognise } from "../geometry/recognise";
import { learnedTemplates } from "./learnedTemplates";

/* The contact points that belong to nobody yet. A puck that has already
   been learned and simply stays on the table is recognised, and its points
   drop out here: you can put the next puck down beside it without taking
   the previous one away. `learn.known` keeps how many pucks lie there that
   way, only so it can be said out loud. */
export function learnPoints(): TouchPoint[] {
    const pts = [...touches.real.values()];
    const known = learnedTemplates();
    if (!known.length) {
        learn.known = 0;
        return pts;
    }
    const { pucks, usedIdx } = recognise(pts, known);
    learn.known = pucks.length;
    return pts.filter((p, i) => !usedIdx.has(i));
}
