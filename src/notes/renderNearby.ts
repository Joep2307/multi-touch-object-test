import { emptyLine } from "../dom/emptyLine";
import { tr } from "../i18n/tr";
import { formatDistance } from "../kg/formatDistance";
import { kg } from "../kg/kg";
import { nearby } from "../kg/nearby";
import type { NoteView } from "../types/NoteView";
import type { Pin } from "../types/Pin";
import { kgReveal } from "./kgReveal";
import { kgRow } from "./kgRow";
import { notePart } from "./notePart";
import { positionNote } from "./positionNote";

export function renderNearby(v: NoteView, pin: Pin): void {
    const box = notePart(v, "noteNearby");
    box.textContent = "";
    if (!kg.loaded) {
        box.appendChild(emptyLine(tr("kgUnreachable")));
        return;
    }
    const near = nearby(pin.lat, pin.lng, { theme: pin.topic, limit: 4 });
    if (!near.length) {
        box.appendChild(emptyLine(tr("nothingWithin")));
        return;
    }
    for (const r of near) {
        const row = kgRow(
            r.node.label,
            formatDistance(r.dist),
            r.match ? "match" : "",
        );
        row.onclick = () => kgReveal(row, r.node);
        box.appendChild(row);
    }
    positionNote(v);
}
