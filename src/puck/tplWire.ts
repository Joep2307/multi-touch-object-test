import type { Template } from "../types/Template";

/* A template as it goes to disk or into an export, whatever its shape. The
   fields of the other shape are written as null: that way the file shows
   they are deliberately empty and not accidentally lost. */
export const tplWire = (t: Template): Record<string, unknown> => ({
    id: t.id,
    verdict: t.verdict,
    ratios: t.ratios || null,
    longestMM: t.longestMM ?? null,
    angles: t.angles || null,
    ringMM: t.ringMM ?? null,
    learnedAt: t.learnedAt || null,
});
