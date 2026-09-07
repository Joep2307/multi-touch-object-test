import { templates } from "../state/templates";
import type { Template } from "../types/Template";
import type { Verdict } from "../types/Verdict";
import { saveOwnPucks } from "./saveOwnPucks";

export function addOwnPuck(
    verdict: Verdict,
    ratios: [number, number],
    longestMM: number,
): Template {
    const p: Template = {
        id: "own-" + String(++templates.ownSeq).padStart(2, "0"),
        verdict,
        ratios,
        longestMM,
        learnedAt: new Date().toISOString(),
        own: true,
    };
    templates.own.push(p);
    saveOwnPucks();
    return p;
}
