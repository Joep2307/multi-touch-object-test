import type { Knowledge } from "@biblio";
import { kg } from "./kg";

/* What's literally written about a place: the text fragments with their
   page number, plus the documents they come from. Only meaningful for
   entities — a document doesn't refer to itself. */
export async function knowledgeOf(entId: string): Promise<Knowledge | null> {
    if (!kg.client) return null;
    try {
        return await kg.client.knowledge(entId);
    } catch (e) {
        console.warn("[kg] knowledge mislukt:", e);
        return null;
    }
}
