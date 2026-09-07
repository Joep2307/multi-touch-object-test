/* Translations, for as far as they can be checked without a screen.
 *
 * English is the source language: tr() falls back to `en`, and the HTML
 * carries English as the text you see for the split second before
 * applyLang() runs. Two things go wrong silently as the table grows, and
 * both are caught here:
 *
 *   · a key added in one language and forgotten in the other — on screen
 *     that is English among the Dutch, which reads as a mistake rather
 *     than as a missing translation;
 *   · a `data-i18n` in exe/index.html pointing at a key that does not
 *     exist — applyLang() then writes the key name into the button.
 *
 * Nothing here loads state, so no DOM is needed; the HTML is read as text.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { describe, expect, it } from "vitest";
import { L } from "../../i18n/L";
import { KG_PHRASES } from "../../kg/KG_PHRASES";
import type { Lang } from "../../types/Lang";

const LANGS = Object.keys(L) as Lang[];

const html = readFileSync(
    fileURLToPath(new URL("../../../exe/index.html", import.meta.url)),
    "utf8",
);

/* Every data-i18n variant carries a key from the same table. */
const keysInHtml = (): string[] => [
    ...new Set(
        [
            ...html.matchAll(
                /data-i18n(?:-html|-ph|-aria|-title|-label)?="([^"]+)"/g,
            ),
        ].map((m) => m[1]),
    ),
];

describe("the language table", () => {
    it("starts with English, the source language", () => {
        expect(LANGS[0]).toBe("en");
        expect(Object.keys(KG_PHRASES)[0]).toBe("en");
    });

    it("knows the same keys in every language", () => {
        const base = Object.keys(L.en).sort();
        for (const lang of LANGS)
            expect(Object.keys(L[lang]).sort()).toEqual(base);
    });

    it("says the same thing in every language for the graph too", () => {
        const base = Object.keys(KG_PHRASES.en).sort();
        for (const lang of LANGS)
            expect(Object.keys(KG_PHRASES[lang]).sort()).toEqual(base);
    });

    it("offers the same number of puck topics in every language", () => {
        for (const lang of LANGS)
            expect(L[lang].topics).toHaveLength(L.en.topics.length);
    });

    it("leaves nothing untranslated: no Dutch value repeated as English", () => {
        /* A key copied over but not translated shows up as an identical
           string. Words that genuinely are the same in both languages are
           listed here, so a real oversight still stands out. */
        const same = new Set([
            "locale",
            "docTitle",
            "menu",
            "language",
            "document",
            "touchscreen",
            "modePuck",
            "puckAdd",
            "puckCount",
            "keyEnter",
            "exportGeo",
            "exportCsv",
            "tileOsm",
            "grpOther",
            "sheetPad",
            "searchPh",
            "tilePastel",
            "tileWater",
            "overlaysHead",
        ]);
        const copied = Object.keys(L.en).filter(
            (k) =>
                !same.has(k) &&
                typeof L.en[k] === "string" &&
                L.en[k] === L.nl[k],
        );
        expect(copied).toEqual([]);
    });

    it("has a phrase behind every data-i18n in the page", () => {
        const missing = keysInHtml().filter((k) => L.en[k] === undefined);
        expect(missing).toEqual([]);
    });
});
