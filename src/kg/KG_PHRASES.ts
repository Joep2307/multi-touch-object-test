import type { Lang, Phrase } from "../types";

/* The wording of the graph itself. The status stores a key instead of a
   sentence, so that a later language switch also updates a line that has
   already been on screen for a while. */
export const KG_PHRASES: Record<Lang, Record<string, Phrase>> = {
    en: {
        off: "off",
        loading: "loading…",
        unreachable: "unreachable",
        noCoords: "graph without coordinates",
        counts: (n: number, m: number) => `${n} points · ${m} themes`,
        document: "document",
        entity: "entity",
        theme: "theme",
    },
    nl: {
        off: "uit",
        loading: "laden…",
        unreachable: "niet bereikbaar",
        noCoords: "graaf zonder coördinaten",
        counts: (n: number, m: number) => `${n} punten · ${m} thema's`,
        document: "document",
        entity: "entiteit",
        theme: "thema",
    },
};
