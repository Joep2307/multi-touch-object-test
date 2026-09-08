import type { ShapeValue } from "../types/ShapeValue";
import type { Template } from "../types/Template";
import { norm360 } from "./geometry/norm360";

/* A measurement may change a puck's shape: read an old triangle onto a puck
   that is a ring from the factory and that puck is a triangle from then on.
   The fields of the previous shape go away, otherwise there are two
   descriptions of the same puck and the recognition has to guess which one
   counts. */
export function applyShape(tpl: Template, sv: ShapeValue): boolean {
    if (
        Number.isFinite(sv?.slots) &&
        (sv.slots as number) >= 4 &&
        Number.isFinite(sv?.code) &&
        (sv.code as number) > 0
    ) {
        tpl.slots = sv.slots;
        tpl.code = sv.code;
        delete tpl.angles;
        delete tpl.ratios;
        delete tpl.longestMM;
        if (Number.isFinite(sv.ringMM) && (sv.ringMM as number) > 0)
            tpl.ringMM = sv.ringMM;
        else delete tpl.ringMM;
        return true;
    }
    if (
        Array.isArray(sv?.angles) &&
        sv.angles.length === 5 &&
        sv.angles.every((n) => Number.isFinite(n))
    ) {
        tpl.angles = sv.angles.map(norm360);
        delete tpl.ratios;
        delete tpl.longestMM;
        delete tpl.slots;
        delete tpl.code;
        if (Number.isFinite(sv.ringMM) && (sv.ringMM as number) > 0)
            tpl.ringMM = sv.ringMM;
        else delete tpl.ringMM;
        return true;
    }
    if (
        Array.isArray(sv?.ratios) &&
        sv.ratios.length === 2 &&
        sv.ratios.every((n) => Number.isFinite(n) && n > 0 && n <= 1.001)
    ) {
        tpl.ratios = [sv.ratios[0], sv.ratios[1]];
        delete tpl.angles;
        delete tpl.ringMM;
        delete tpl.slots;
        delete tpl.code;
        if (Number.isFinite(sv.longestMM) && (sv.longestMM as number) > 0)
            tpl.longestMM = sv.longestMM;
        else delete tpl.longestMM;
        return true;
    }
    return false;
}
