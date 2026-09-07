import { templates } from "../state/templates";

export const OWN_KEY = "pucktable-own-pucks";

export function saveOwnPucks(): void {
    try {
        localStorage.setItem(
            OWN_KEY,
            JSON.stringify(
                templates.own.map((t) => ({
                    id: t.id,
                    verdict: t.verdict,
                    ratios: t.ratios,
                    longestMM: t.longestMM ?? null,
                    learnedAt: t.learnedAt || null,
                })),
            ),
        );
    } catch (e) {}
}
