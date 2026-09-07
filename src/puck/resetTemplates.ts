import { TPL_FACTORY } from "../config/TPL_FACTORY";
import { templates } from "../state/templates";
import { TPL_KEY } from "./saveTemplates";

/* Back to the blueprint. */
export function resetTemplates(): void {
    for (const t of templates.list) {
        const f = TPL_FACTORY.find((x) => x.id === t.id);
        if (!f) continue;
        t.ratios = [f.ratios[0], f.ratios[1]];
        delete t.longestMM;
        delete t.learnedAt;
    }
    try {
        localStorage.removeItem(TPL_KEY);
    } catch (e) {}
}
