import { VERDICTS } from "../config";
import { templates } from "../state";
import { applyShape } from "./applyShape";
import { OWN_KEY } from "./constants";
import { shapeValueOf } from "./shapeValueOf";
import type { Template, Verdict } from "../types";

/* Only data that genuinely looks like a measurement is accepted: an unknown
   kind or an impossible ratio would quietly throw off recognition.

   The shape goes through `applyShape`, the same door as the learning
   window and as `restoreTemplates`. That is what decides which of the
   three shapes a stored record is, and it is what this function used to
   do by hand for triangles only -- so a ring or a grid code learned in the
   puck stand was refused on every reload, and `ownSeq` never advanced
   past it either. */
export function restoreOwnPucks(): void {
    let saved: unknown = null;
    try {
        saved = JSON.parse(localStorage.getItem(OWN_KEY) || "null");
    } catch (e) {
        return;
    }
    if (!Array.isArray(saved)) return;
    for (const sv of saved as Array<Record<string, unknown> | null>) {
        if (!sv || typeof sv.id !== "string") continue;
        if (!VERDICTS.some((v) => v.key === sv.verdict)) continue;
        if (templates.own.some((t) => t.id === sv.id)) continue;
        const p: Template = {
            id: sv.id,
            verdict: sv.verdict as Verdict,
            own: true,
        };
        if (!applyShape(p, shapeValueOf(sv))) continue;
        p.learnedAt = typeof sv.learnedAt === "string" ? sv.learnedAt : null;
        templates.own.push(p);
        /* So the next puck learned at the stand gets a number of its own
         rather than one that is already on the shelf. */
        const n = parseInt(String(sv.id).replace(/^\D+/, ""), 10);
        if (Number.isFinite(n))
            templates.ownSeq = Math.max(templates.ownSeq, n);
    }
}
