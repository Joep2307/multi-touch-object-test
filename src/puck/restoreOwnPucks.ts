import { VERDICTS } from "../config/VERDICTS";
import { templates } from "../state/templates";
import type { Template } from "../types/Template";
import type { Verdict } from "../types/Verdict";
import { OWN_KEY } from "./saveOwnPucks";

/* Only data that genuinely looks like a measurement is accepted: an unknown
   kind or an impossible ratio would quietly throw off recognition. */
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
        const r = sv.ratios;
        if (
            !Array.isArray(r) ||
            r.length !== 2 ||
            !r.every((n) => Number.isFinite(n) && n > 0 && n <= 1.001)
        )
            continue;
        if (templates.own.some((t) => t.id === sv.id)) continue;
        const p: Template = {
            id: sv.id,
            verdict: sv.verdict as Verdict,
            ratios: [r[0], r[1]],
            learnedAt: typeof sv.learnedAt === "string" ? sv.learnedAt : null,
            own: true,
        };
        if (Number.isFinite(sv.longestMM) && (sv.longestMM as number) > 0)
            p.longestMM = sv.longestMM as number;
        templates.own.push(p);
        const n = parseInt(String(sv.id).replace(/^\D+/, ""), 10);
        if (Number.isFinite(n))
            templates.ownSeq = Math.max(templates.ownSeq, n);
    }
}
