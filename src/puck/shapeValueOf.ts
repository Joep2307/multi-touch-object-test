import type { ShapeValue } from "../types";

/* One stored record read back as a measured shape.
 *
 * The half of restoring a template that is the same whichever list it
 * came from: the four from the blueprint and the pucks from the stand are
 * written by the same `tplWire` and have to be read by the same rules.
 * They were not, and that is why a ring or grid code learned in the puck
 * stand disappeared on the next reload -- only the triangle fields were
 * ever looked at.
 *
 * What is not there is left out rather than set to `undefined`. Those are
 * two ways of saying the same thing, and then every reader has to guess
 * which of the two it is looking at. */
export function shapeValueOf(sv: Record<string, unknown>): ShapeValue {
    const num = (v: unknown): number | undefined =>
        Number.isFinite(v) ? (v as number) : undefined;
    const maybe = <K extends string, V>(
        key: K,
        value: V | undefined,
    ): Partial<Record<K, V>> =>
        value === undefined ? {} : ({ [key]: value } as Record<K, V>);
    const r = sv.ratios,
        a = sv.angles;
    return {
        ...(Array.isArray(r) && r.length === 2
            ? { ratios: [r[0] as number, r[1] as number] as [number, number] }
            : {}),
        ...maybe("longestMM", num(sv.longestMM)),
        ...(Array.isArray(a) ? { angles: a as number[] } : {}),
        ...maybe("ringMM", num(sv.ringMM)),
        ...maybe("slots", num(sv.slots)),
        ...maybe("code", num(sv.code)),
    };
}
