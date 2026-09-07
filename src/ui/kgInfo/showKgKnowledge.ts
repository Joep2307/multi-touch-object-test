import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { kg } from "../../kg/kg";
import { knowledgeOf } from "../../kg/knowledgeOf";
import type { KgNode } from "../../types/KgNode";

/* The literal excerpts about a place, in the reading window next to the point. */
export async function showKgKnowledge(node: KgNode): Promise<void> {
    const body = el("kgInfoBody");
    body.textContent = tr("searching");
    const k = await knowledgeOf(node.id);
    if (kg.selected !== node) return;
    const chunks = (k?.chunks || []).slice(0, 3);
    body.textContent = "";
    if (!k || !chunks.length) {
        const p = document.createElement("p");
        p.className = "empty";
        p.textContent = k ? tr("noExcerpts") : tr("noBackend");
        body.appendChild(p);
        return;
    }
    const titleOf = new Map((k.documents || []).map((d) => [d.id, d.title]));
    for (const c of chunks) {
        const q = document.createElement("p");
        q.className = "kg-quote";
        q.textContent = "“" + c.excerpt.trim() + "”";
        const src = document.createElement("span");
        src.className = "src";
        src.textContent =
            (titleOf.get(c.doc_id) || c.doc_id) +
            (c.page ? " · p. " + c.page : "");
        q.appendChild(src);
        body.appendChild(q);
    }
}
