import { KG_PHRASES } from "./KG_PHRASES";
import { kg } from "./kg";

/* The type label above a tapped point: kind, type and year. */
export function kgDescribe(n: {
    type: string;
    etype?: string;
    year?: number | null;
}): string {
    const bits = [(KG_PHRASES[kg.lang][n.type] as string) || n.type];
    if (n.etype) bits.push(n.etype);
    if (n.year) bits.push(String(n.year));
    return bits.join(" · ");
}
