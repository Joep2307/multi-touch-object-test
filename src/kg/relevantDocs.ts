import type { Doc } from "@biblio";
import { kg } from "./kg";

/* Searching on what was said rather than on where it was said.
   `semantic` has coco-biblio run the sentence through the embedder and
   search on meaning — that finds the waste policy even if it's in a piece
   about the city center. If no backend is running, the client falls back
   to the fixtures and it becomes a plain word search. */
export async function relevantDocs(
    text: string,
    { limit = 4 }: { limit?: number } = {},
): Promise<Doc[]> {
    const q = (text || "").trim();
    if (!kg.client || q.length < 4) return [];
    try {
        const docs = await kg.client.documents({ search: q, semantic: true });
        return docs.slice(0, limit);
    } catch (e) {
        console.warn("[kg] zoeken mislukt:", e);
        return [];
    }
}
