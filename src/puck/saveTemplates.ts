import { templates } from "../state/templates";

export const TPL_KEY = "pucktable-templates";

export function saveTemplates(): void {
    try {
        localStorage.setItem(
            TPL_KEY,
            JSON.stringify(
                templates.list.map((t) => ({
                    id: t.id,
                    ratios: t.ratios,
                    longestMM: t.longestMM ?? null,
                    learnedAt: t.learnedAt || null,
                })),
            ),
        );
    } catch (e) {}
}
