import { notes } from "../state/notes";
import type { NoteView } from "../types/NoteView";
import type { Side } from "../types/Side";

/* Het notitievenster van deze kant, of anders dat van de andere. Zie
   `kbOnSide` voor waarom dit uitgeschreven staat. */
export const noteViewOnSide = (side: Side): NoteView => {
    const found = notes.views.find((v) => v.side === side);
    const any = notes.views[0];
    if (found) return found;
    if (any) return any;
    throw new Error("Er is geen enkel notitievenster aangemaakt.");
};
