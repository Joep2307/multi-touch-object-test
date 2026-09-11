import { templates } from "../state/templates";
import type { ShapeValue } from "../types/ShapeValue";
import { applyShape } from "./applyShape";
import { TPL_KEY } from "./saveTemplates";

/* Only the four known pucks get updated. What's stored in localStorage is a
   measurement, not a new puck: an old or unfamiliar file can therefore never
   invent a puck that the code doesn't know about.

   The measurement goes back through `applyShape`, the same door as the
   learning window. That checks what a shape has to look like, and -- just
   as importantly -- it removes the fields of the other shapes. Reading the
   stored numbers straight into the template used to leave a puck with a
   triangle from disk and the ring from the drawing at the same time, and
   then the recognition had two descriptions of one puck. */
export function restoreTemplates(): void {
    let saved: unknown = null;
    try {
        saved = JSON.parse(localStorage.getItem(TPL_KEY) || "null");
    } catch (e) {
        return;
    }
    if (!Array.isArray(saved)) return;
    const num = (v: unknown): number | undefined =>
        Number.isFinite(v) ? (v as number) : undefined;
    /* Een veld dat er niet is, laat je weg. */
    const maybe = <K extends string, V>(
        key: K,
        value: V | undefined,
    ): Partial<Record<K, V>> =>
        value === undefined ? {} : ({ [key]: value } as Record<K, V>);
    for (const sv of saved as Array<Record<string, unknown> | null>) {
        const tpl = templates.list.find((t) => t.id === sv?.id);
        if (!tpl || !sv) continue;
        const r = sv.ratios,
            a = sv.angles;
        /* Wat niet gemeten is, staat er niet in. Een veld op
           `undefined` zetten en een veld weglaten zijn twee manieren
           om hetzelfde te zeggen, en dan moet elke lezer raden welke
           van de twee hij voor zich heeft. */
        const shape: ShapeValue = {
            ...(Array.isArray(r) && r.length === 2
                ? {
                      ratios: [r[0] as number, r[1] as number] as [
                          number,
                          number,
                      ],
                  }
                : {}),
            ...maybe("longestMM", num(sv.longestMM)),
            ...(Array.isArray(a) ? { angles: a as number[] } : {}),
            ...maybe("ringMM", num(sv.ringMM)),
            ...maybe("slots", num(sv.slots)),
            ...maybe("code", num(sv.code)),
        };
        if (applyShape(tpl, shape) && typeof sv.learnedAt === "string")
            tpl.learnedAt = sv.learnedAt;
    }
}
