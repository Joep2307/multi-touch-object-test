import { openNote } from "../../notes";
import { pins } from "../../state";
import { dropPin } from "../dropPin";
import { syncPlacedPinTopic } from "../syncPlacedPinTopic";
import { ringItems } from "./ringItems";
import type { Track } from "../../types";

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
