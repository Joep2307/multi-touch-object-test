import { MV } from "../map";
import { openNote } from "../notes";
import { save } from "../pins";
import { pins } from "../state";
import { puckTopic } from "./ring";
import type { Pin, Track } from "../types";

/* Place a marker at the puck's position, and open the panel that goes with it.
 */
export function dropPin(t: Track): void {
    const ll = MV.unproject(t.x, t.y);
    const pin: Pin = {
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        lng: +ll.lng.toFixed(6),
        lat: +ll.lat.toFixed(6),
        verdict: t.tpl.verdict,
        topic: puckTopic(t),
        title: "",
        description: "",
        note: "",
        transcript: "",
        t: new Date().toISOString(),
    };
    pins.list.push(pin);
    // Keep the mark linked to this puck while it remains on the table.
    // Rotating the puck can then correct its topic after confirming as well.
    t.pinId = pin.id;
    t.armed = false;
    t.flash = 1;
    save();
    openNote(pin, t.x, t.y, true);
}
