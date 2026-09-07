import { topics } from "../../i18n/topics";
import { tr } from "../../i18n/tr";
import type { RingItem } from "../../types/RingItem";
import type { Track } from "../../types/Track";

/* ── The menu around the puck ─────────────────────────────────────────────
   The ring around a puck used to be a single list of topics. That worked as
   long as the puck only placed markers, but the map also needs to be
   controlled, and at a table there's no free second hand for a button on
   the edge. So the ring has become a menu with two levels:

     main menu   Move · Zoom · Select · Back  (starting from the top, clockwise)
     select      the topics · Back

   `Back` does sit on the ring in the main menu, but it's disabled: that way
   the ring's division stays the same, and you can see right away where it
   will end up once you're one level deeper.

   Selecting doesn't happen with a tap. A tap places the marker, and that
   can't happen twice by accident. You rotate to an option and hold the puck
   still for a moment; after `CFG.puckDwellMS` the choice is made. That's
   also what a heavy disc on a table does naturally — it stays put where you
   let go of it. */
export function ringItems(t: Track): RingItem[] {
    if (t.menu === "topics")
        return topics()
            .map((name): RingItem => ({ key: "topic", label: name }))
            .concat([{ key: "back", label: tr("puckBack") }]);
    // Move starts at the top, then clockwise Zoom, Select and Back.
    return [
        { key: "move", label: tr("puckMove") },
        { key: "zoom", label: tr("puckZoom") },
        { key: "select", label: tr("puckSelect") },
        { key: "back", label: tr("puckBack"), disabled: true },
    ];
}
