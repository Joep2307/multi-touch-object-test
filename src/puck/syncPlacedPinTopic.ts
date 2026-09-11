import { topicLabel, vName } from "../i18n";
import { notePart, noteViewFor } from "../notes";
import { save } from "../pins";
import { pins } from "../state";
import { puckTopic } from "./ring";
import type { Track } from "../types";

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
