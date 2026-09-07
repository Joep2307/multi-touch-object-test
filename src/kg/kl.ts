import { KG_PHRASES } from "./KG_PHRASES";
import { kg } from "./kg";

/* Translate within the graph, with English as the fallback. */
export const kl = (k: string, ...a: unknown[]): string => {
    const v =
        KG_PHRASES[kg.lang][k] !== undefined
            ? KG_PHRASES[kg.lang][k]
            : KG_PHRASES.en[k];
    if (v === undefined) return k;
    return typeof v === "function" ? v(...a) : v;
};
