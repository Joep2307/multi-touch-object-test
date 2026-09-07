import { templates } from "../state/templates";
import { TPL_KEY } from "./saveTemplates";

/* Only the four known pucks get updated. What's stored in localStorage is a
   measurement, not a new puck: an old or unfamiliar file can therefore never
   invent a puck that the code doesn't know about. */
export function restoreTemplates(): void {
    let saved: unknown = null;
    try {
        saved = JSON.parse(localStorage.getItem(TPL_KEY) || "null");
    } catch (e) {
        return;
    }
    if (!Array.isArray(saved)) return;
    for (const sv of saved as Array<Record<string, unknown> | null>) {
        const tpl = templates.list.find((t) => t.id === sv?.id);
        if (!tpl || !sv) continue;
        const r = sv.ratios;
        if (
            Array.isArray(r) &&
            r.length === 2 &&
            r.every((n) => Number.isFinite(n) && n > 0 && n <= 1.001)
        )
            tpl.ratios = [r[0], r[1]];
        if (Number.isFinite(sv.longestMM) && (sv.longestMM as number) > 0)
            tpl.longestMM = sv.longestMM as number;
        if (typeof sv.learnedAt === "string") tpl.learnedAt = sv.learnedAt;
    }
}
