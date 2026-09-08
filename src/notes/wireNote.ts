import { noteToPin } from "../pins/noteToPin";
import { save } from "../pins/save";
import { saveSoon } from "../pins/saveSoon";
import { pins } from "../state/pins";
import { saveTalkAudio } from "../talk/saveTalkAudio";
import { toggleTalk } from "../talk/toggleTalk";
import type { NoteView } from "../types/NoteView";
import { askKnowledge } from "./askKnowledge";
import { closeNote } from "./closeNote";
import { flipNote } from "./flipNote";
import { notePart } from "./notePart";
import { positionNote } from "./positionNote";
import { renderMatches } from "./renderMatches";
import { saveContactFollowup } from "./saveContactFollowup";
import { showContactFollowup } from "./showContactFollowup";

/* Every button in the window belongs to THIS window. Hence wiring it here
   rather than once per id: there are two of everything. */
export function wireNote(v: NoteView): void {
    const q = <T extends HTMLElement = HTMLElement>(id: string) =>
        notePart<T>(v, id);
    q("noteFlip").onclick = () => flipNote(v.pin);
    q("noteSave").onclick = () => {
        const pin = v.pin;
        if (pin) {
            setTimeout(() => {
                if (v.pin === pin) renderMatches(v, pin);
            }, 0);
            noteToPin(v);
            save();
        }
        if (pin) showContactFollowup(v, pin);
        else closeNote(v);
    };
    q("contactSkip").onclick = () => closeNote(v);
    q("contactSave").onclick = () => saveContactFollowup(v);
    q("noteDel").onclick = () => {
        if (v.pin) {
            const i = pins.list.indexOf(v.pin);
            if (i >= 0) pins.list.splice(i, 1);
            save();
        }
        closeNote(v);
    };
    q("noteAsk").onclick = () => askKnowledge(v);
    for (const id of ["noteTitle", "noteText"])
        q(id).addEventListener("input", () => {
            noteToPin(v);
            saveSoon();
        });
    q("talkBtn").onclick = () => toggleTalk(v);
    q("talkClear").onclick = () => {
        if (!v.pin) return;
        v.pin.transcript = "";
        q<HTMLTextAreaElement>("talkText").value = "";
        q("talkClear").style.display = "none";
        save();
    };
    q("talkText").addEventListener("input", () => {
        if (!v.pin) return;
        v.pin.transcript = q<HTMLTextAreaElement>("talkText").value;
        saveSoon();
    });
    q("talkAudio").onclick = saveTalkAudio;
    // Each window watches its own height: if the answer grows, this window
    // shifts back into view and the other one doesn't.
    if (typeof ResizeObserver !== "undefined")
        new ResizeObserver(() => positionNote(v, false)).observe(v.el);
}
