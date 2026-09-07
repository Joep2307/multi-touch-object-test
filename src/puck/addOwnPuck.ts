import { templates } from "../state/templates";
import type { ShapeValue } from "../types/ShapeValue";
import type { Template } from "../types/Template";
import type { Verdict } from "../types/Verdict";
import { applyShape } from "./applyShape";
import { saveOwnPucks } from "./saveOwnPucks";

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
