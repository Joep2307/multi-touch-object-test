import { notePart } from "./notePart";
import { positionNote } from "./positionNote";
import type { NoteView, Pin } from "../types";

export function showContactFollowup(v: NoteView, pin: Pin): void {
    const contact = pin.contact;
    notePart<HTMLInputElement>(v, "contactName").value = contact?.name || "";
    notePart<HTMLInputElement>(v, "contactEmail").value = contact?.email || "";
    notePart<HTMLInputElement>(v, "contactPhone").value = contact?.phone || "";
    notePart<HTMLInputElement>(v, "contactConsent").checked =
        contact?.consent === true;
    const status = notePart(v, "contactStatus");
    status.textContent = "";
    status.classList.remove("saved");
    v.el.classList.add("contact-step");
    positionNote(v);
    notePart<HTMLInputElement>(v, "contactName").focus();
}
