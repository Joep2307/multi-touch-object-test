import { kgUrl } from "../config/kgUrl";
import { emptyLine } from "../dom/emptyLine";
import { tr } from "../i18n/tr";
import { ensureKG } from "../kg/ensureKG";
import type { NoteView } from "../types/NoteView";
import type { Pin } from "../types/Pin";
import { notePart } from "./notePart";
import { renderMatches } from "./renderMatches";
import { renderNearby } from "./renderNearby";

/* ── What the knowledge graph knows about this place ─────────────────────
   Independent of the map layer: the window loads the graph itself if it
   has to, even when "Show graph" is off. */
export function fillNoteKnowledge(v: NoteView, pin: Pin): void {
    v.askAbort?.abort();
    v.askAbort = null;
    notePart(v, "noteAnswer").textContent = "";
    notePart(v, "noteAnswer").style.display = "none";
    notePart(v, "noteSources").textContent = "";
    notePart(v, "noteSources").style.display = "none";
    const box = notePart(v, "noteNearby");
    box.innerHTML = "";
    box.appendChild(emptyLine(tr("kgLoading")));
    notePart(v, "noteMatches").textContent = "";
    notePart(v, "noteMatchHead").style.display = "none";
    ensureKG(kgUrl()).then(() => {
        if (v.pin !== pin) return;
        renderNearby(v, pin);
        renderMatches(v, pin);
    });
}
