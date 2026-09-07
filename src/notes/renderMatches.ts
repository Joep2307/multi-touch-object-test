import { relevantDocs } from "../kg/relevantDocs";
import type { NoteView } from "../types/NoteView";
import type { Pin } from "../types/Pin";
import { openDocument } from "../ui/kgInfo/openDocument";
import { kgRow } from "./kgRow";
import { notePart } from "./notePart";
import { positionNote } from "./positionNote";

/* Search on the MEANING of what was said, independent of distance. Hence
   its own separate list: these are pieces that are about the topic, even
   if they're located on the other side of town. */
export async function renderMatches(v: NoteView, pin: Pin): Promise<void> {
    const box = notePart(v, "noteMatches"),
        head = notePart(v, "noteMatchHead");
    box.textContent = "";
    head.style.display = "none";
    const q = [pin.title, pin.description || pin.note]
        .filter(Boolean)
        .join(" ");
    const docs = await relevantDocs(q);
    if (v.pin !== pin || !docs.length) return;
    head.style.display = "block";
    for (const d of docs) {
        const row = kgRow(d.title, d.year ? String(d.year) : "");
        row.onclick = () => openDocument(d.id, d.title);
        box.appendChild(row);
    }
    positionNote(v, false);
}
