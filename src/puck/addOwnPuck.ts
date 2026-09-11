import { templates } from "../state";
import { applyShape } from "./applyShape";
import { saveOwnPucks } from "./saveOwnPucks";
import type { ShapeValue, Template, Verdict } from "../types";

/* The puck stand has no fixed four: every measurement is added as a new
   puck, whatever shape it has. */
export function addOwnPuck(
    verdict: Verdict,
    shape: ShapeValue,
): Template | null {
    const p: Template = {
        id: "own-" + String(++templates.ownSeq).padStart(2, "0"),
        verdict,
        learnedAt: new Date().toISOString(),
        own: true,
    };
    if (!applyShape(p, shape)) return null;
    templates.own.push(p);
    saveOwnPucks();
    return p;
}
