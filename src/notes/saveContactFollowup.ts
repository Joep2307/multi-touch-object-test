import { tr } from "../i18n/tr";
import { save } from "../pins/save";
import type { NoteView } from "../types/NoteView";
import { closeNote } from "./closeNote";
import { notePart } from "./notePart";

export function saveContactFollowup(v: NoteView): void {
    if (!v.pin) return;
    const name = notePart<HTMLInputElement>(v, "contactName").value.trim();
    const email = notePart<HTMLInputElement>(v, "contactEmail").value.trim();
    const phone = notePart<HTMLInputElement>(v, "contactPhone").value.trim();
    const consent = notePart<HTMLInputElement>(v, "contactConsent").checked;
    const status = notePart(v, "contactStatus");
    status.classList.remove("saved");
    if (!email && !phone) {
        status.textContent = tr("contactNeedDetail");
        return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = tr("contactInvalidEmail");
        return;
    }
    if (!consent) {
        status.textContent = tr("contactNeedConsent");
        return;
    }
    v.pin.contact = {
        name,
        email,
        phone,
        consent: true,
        consentAt: v.pin.contact?.consentAt || new Date().toISOString(),
    };
    save();
    status.textContent = tr("contactSaved");
    status.classList.add("saved");
    const pin = v.pin;
    setTimeout(() => {
        if (v.pin === pin) closeNote(v);
    }, 650);
}
