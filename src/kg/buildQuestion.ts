import { formatDistance } from "./formatDistance";
import { kg } from "./kg";
import type { NearbyHit } from "../types";

/* The question the table asks the graph. Everything the RAG search needs
   is in it: what was said, where, under which theme, and which documents
   are nearby. */
export function buildQuestion({
    title,
    description,
    topic,
    verdictName,
    place,
    near,
}: {
    title: string;
    description: string;
    topic: string;
    verdictName: string;
    place: string;
    near: Pick<NearbyHit, "node" | "dist">[];
}): string {
    const said =
        [title, description].filter(Boolean).join(" — ") ||
        (kg.lang === "en"
            ? "(no explanation given)"
            : "(geen toelichting gegeven)");
    const docs = near
        .filter((r) => r.node.type === "document")
        .map((r) => `"${r.node.label}" (${formatDistance(r.dist)})`);
    if (kg.lang === "en") {
        return [
            `At a participation table in Breda, the following was ` +
                `said about ${place}: "${said}".`,
            `Theme: ${topic}. Nature of the remark: ${verdictName}.`,
            docs.length
                ? `Documents in the immediate vicinity: ${docs.join(", ")}.`
                : "",
            "Question: what do the policy and the documents say " +
                "about this place and this theme, and what solution " +
                "or next step follows from that? Answer briefly and " +
                "in English, and refer to the documents you base " +
                "yourself on.",
        ]
            .filter(Boolean)
            .join(" ");
    }
    return [
        `Aan een participatietafel in Breda is bij ${place} ` +
            `het volgende gezegd: "${said}".`,
        `Thema: ${topic}. Aard van de opmerking: ${verdictName}.`,
        docs.length
            ? `Documenten in de directe omgeving: ${docs.join(", ")}.`
            : "",
        "Vraag: wat is er in het beleid en de documenten over deze " +
            "plek en dit thema bekend, en welke oplossing of " +
            "vervolgstap volgt daaruit? Antwoord kort en in het " +
            "Nederlands, en verwijs naar de documenten waar je je op " +
            "baseert.",
    ]
        .filter(Boolean)
        .join(" ");
}
