import { TPL_FACTORY } from "../config";
import { templates } from "../state";
import { cloneTpl } from "./cloneTpl";
import { TPL_KEY } from "./constants";

/* Back to the blueprint. First all shape fields go: a puck that was learned
   as a triangle has to become the ring of the drawing again, not both at
   once. */
export function resetTemplates(): void {
    for (const t of templates.list) {
        const f = TPL_FACTORY.find((x) => x.id === t.id);
        if (!f) continue;
        delete t.ratios;
        delete t.longestMM;
        delete t.angles;
        delete t.ringMM;
        delete t.slots;
        delete t.code;
        delete t.learnedAt;
        delete t.duoSeen;
        Object.assign(t, cloneTpl(f));
    }
    try {
        localStorage.removeItem(TPL_KEY);
    } catch (e) {}
}
