import { openNote } from "../../notes/openNote";
import { pins } from "../../state/pins";
import type { Track } from "../../types/Track";
import { dropPin } from "../dropPin";
import { syncPlacedPinTopic } from "../syncPlacedPinTopic";
import { ringItems } from "./ringItems";

/* Carry out a choice from the ring. Only here does a puck's mode change,
   so there's a single place to read what each option does. */
export function commitPuckChoice(t: Track, idx: number): void {
    const items = ringItems(t),
        item = items[idx];
    if (!item || item.disabled) return;
    if (item.key === "topic") {
        t.topicIdx = idx;
        if (t.armed) dropPin(t);
        else {
            syncPlacedPinTopic(t);
            const pin = t.pinId
                ? pins.list.find((p) => p.id === t.pinId)
                : null;
            if (pin) openNote(pin, t.x, t.y, true);
        }
    }
    t.ring = false;
}
