import { tr } from "../i18n/tr";
import { knowledgeOf } from "../kg/knowledgeOf";
import type { KgNode } from "../types/KgNode";
import { openDocument } from "../ui/kgInfo/openDocument";
import { noteViewOf } from "./noteViewOf";
import { positionNote } from "./positionNote";

/* Tapping a row. A document opens itself; for a place, we fetch
   what is literally written about it and unfold that underneath. */
export async function kgReveal(row: HTMLElement, node: KgNode): Promise<void> {
    // Which window this is follows from the row itself: with two windows
    // open, this could be either one.
    const v = noteViewOf(row);
    const open = row.nextElementSibling?.classList.contains("kg-quote");
    [...row.parentElement!.querySelectorAll(".kg-quote")].forEach((q) =>
        q.remove(),
    );
    if (open) {
        positionNote(v, false);
        return;
    }
    if (node.type === "document") {
        openDocument(node.id, node.label);
        return;
    }
    const box = document.createElement("div");
    box.className = "kg-quote";
    box.textContent = tr("searching");
    row.after(box);
    positionNote(v, false);
    const k = await knowledgeOf(node.id);
    const chunks = (k?.chunks || []).slice(0, 3);
    if (!k) {
        box.textContent = tr("noBackend");
        positionNote(v, false);
        return;
    }
    if (!chunks.length) {
        box.textContent = tr("noExcerpts");
        positionNote(v, false);
        return;
    }
    box.textContent = "";
    const titleOf = new Map((k.documents || []).map((d) => [d.id, d.title]));
    for (const c of chunks) {
        const q = document.createElement("p");
        q.style.margin = "0 0 8px";
        q.textContent = "“" + c.excerpt.trim() + "”";
        const src = document.createElement("span");
        src.className = "src";
        src.textContent =
            (titleOf.get(c.doc_id) || c.doc_id) +
            (c.page ? " · p. " + c.page : "");
        q.appendChild(src);
        box.appendChild(q);
    }
    positionNote(v, false);
}
