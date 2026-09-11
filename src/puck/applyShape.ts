import type { ShapeValue } from "../types/ShapeValue";
import type { Template } from "../types/Template";
import { norm360 } from "./geometry/norm360";

/* Een gemeten waarde die er ook echt is. `Number.isFinite` alleen
   vertelt de compiler niets: het weet daarna nog steeds niet dat de
   waarde geen `undefined` is, en dat is precies waarom hier vroeger
   vijf keer `as number` stond. */
const finite = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v);

/* A measurement may change a puck's shape: read an old triangle onto a puck
   that is a ring from the factory and that puck is a triangle from then on.
   The fields of the previous shape go away, otherwise there are two
   descriptions of the same puck and the recognition has to guess which one
   counts. */
export function applyShape(tpl: Template, sv: ShapeValue): boolean {
    const { slots, code, ringMM, longestMM, angles, ratios } = sv;

    if (finite(slots) && slots >= 4 && finite(code) && code > 0) {
        tpl.slots = slots;
        tpl.code = code;
        delete tpl.angles;
        delete tpl.ratios;
        delete tpl.longestMM;
        if (finite(ringMM) && ringMM > 0) tpl.ringMM = ringMM;
        else delete tpl.ringMM;
        return true;
    }

    if (
        Array.isArray(angles) &&
        angles.length === 5 &&
        angles.every((n) => Number.isFinite(n))
    ) {
        tpl.angles = angles.map(norm360);
        delete tpl.ratios;
        delete tpl.longestMM;
        delete tpl.slots;
        delete tpl.code;
        if (finite(ringMM) && ringMM > 0) tpl.ringMM = ringMM;
        else delete tpl.ringMM;
        return true;
    }

    if (
        Array.isArray(ratios) &&
        ratios.length === 2 &&
        ratios.every((n) => Number.isFinite(n) && n > 0 && n <= 1.001)
    ) {
        tpl.ratios = [ratios[0], ratios[1]];
        delete tpl.angles;
        delete tpl.ringMM;
        delete tpl.slots;
        delete tpl.code;
        if (finite(longestMM) && longestMM > 0) tpl.longestMM = longestMM;
        else delete tpl.longestMM;
        return true;
    }
    return false;
}
