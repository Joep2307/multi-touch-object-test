import { topicLabel } from "../i18n/topicLabel";
import { vName } from "../i18n/vName";
import { notePart } from "../notes/notePart";
import { noteViewFor } from "../notes/noteViewFor";
import { save } from "../pins/save";
import { pins } from "../state/pins";
import type { Track } from "../types/Track";
import { puckTopic } from "./ring/puckTopic";

/* If the puck is rotated to a different topic after being placed, the
   marker follows along — and so does the panel attached to it. */
export function syncPlacedPinTopic(t: Track): void {
    if (!t.pinId) return;
    const pin = pins.list.find((p) => p.id === t.pinId);
    if (!pin) {
        t.pinId = null;
        return;
    }
    const topic = puckTopic(t);
    if (pin.topic === topic) return;
    pin.topic = topic;
    save();
    const view = noteViewFor(pin);
    if (view)
        notePart(view, "noteHead").textContent =
            vName(pin.verdict) + " · " + topicLabel(pin.topic);
}
