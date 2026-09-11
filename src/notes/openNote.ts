import { CFG } from "../config";
import { topicLabel, vColor, vName } from "../i18n";
import { chipHeight } from "../render";
import { checkTalk, renderTalk, talkRunning } from "../talk";
import { resetPanelOffset } from "../ui/panels";
import { closeNote } from "./closeNote";
import { fillNoteKnowledge } from "./fillNoteKnowledge";
import { flipFor } from "./flipFor";
import { notePart } from "./notePart";
import { noteViewFor } from "./noteViewFor";
import { noteViewOnSide } from "./noteViewOnSide";
import { positionNoteX } from "./positionNoteX";
import { positionNote } from "./positionNote";
import type { NoteView, Pin } from "../types";

export function openNote(
    pin: Pin,
    x: number,
    y: number,
    fromPuck = false,
): NoteView {
    // Which side of the table: at the top of the screen is someone on the far
    // side.
    const v = noteViewOnSide(flipFor(pin, y) ? "b" : "a");
    // The same marker should only be in one window. If it was on the other
    // side, it moves here -- along with its recording, since it's the same
    // contribution and the same microphone.
    const was = noteViewFor(pin);
    if (was && was !== v) closeNote(was, { keepTalk: true });
    // Whatever was on THIS side closes; that recording should stop,
    // since nobody is listening to it anymore.
    if (v.pin && v.pin !== pin) closeNote(v);
    v.pin = pin;
    const n = v.el;
    n.classList.remove("contact-step");
    // A window is tied to a marker. If it opens for a different marker, it
    // should start next to THAT marker again — a previous manual drag
    // doesn't carry over to a new window.
    resetPanelOffset(n);
    n.style.display = "block";
    n.classList.toggle("flipped", v.flip);
    n.style.setProperty("--flip", v.flip ? "180deg" : "0deg");
    n.style.setProperty("--note-color", vColor(pin.verdict));
    n.dataset.anchorX = String(x);
    n.dataset.anchorY = String(y);
    // The window opens next to the puck, but must also clear its ring of
    // choices: otherwise it would overlap "Choose" and "Zoom". The offset
    // therefore follows the ring and the chips around it.
    n.dataset.puckReach = String(
        fromPuck ? Math.round(CFG.ringPX + chipHeight() * 1.35 + 10) : 34,
    );
    positionNoteX(v);
    positionNote(v);
    n.classList.remove("opening");
    if (fromPuck) {
        void n.offsetWidth;
        n.classList.add("opening");
    }
    notePart(v, "noteHead").textContent =
        vName(pin.verdict) + " · " + topicLabel(pin.topic);
    notePart<HTMLInputElement>(v, "noteTitle").value = pin.title || "";
    notePart<HTMLTextAreaElement>(v, "noteText").value =
        pin.description || pin.note || "";
    renderTalk(v);
    if (!talkRunning(pin)) checkTalk(v);
    fillNoteKnowledge(v, pin);
    notePart(v, "noteTitle").focus();
    return v;
}
