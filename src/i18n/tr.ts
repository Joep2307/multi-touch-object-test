import { ui } from "../state";
import { L } from "./L";

/* Translate. Not `t` — elsewhere that is the name of a touch and of a puck
   template. If a key is missing in the chosen language it falls back to
   English (the source language) and otherwise to the key itself, so a
   forgotten line becomes visible instead of empty. */
export const tr = (k: string, ...a: unknown[]): string => {
    const v = L[ui.lang][k] !== undefined ? L[ui.lang][k] : L.en[k];
    if (v === undefined) return k;
    return typeof v === "function" ? v(...a) : (v as string);
};
