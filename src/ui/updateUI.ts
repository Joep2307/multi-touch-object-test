import { DEV } from "../config/DEV";
import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { analytics } from "../state/analytics";
import { pins } from "../state/pins";
import { touches } from "../state/touches";
import type { Track } from "../types/Track";
import { renderAnalytics } from "./analytics/renderAnalytics";

/* ═══════════════════════════════════════════════════════════════
   UI — what needs to happen continuously during a session is little
   ═══════════════════════════════════════════════════════════════
   The map draws itself and the pucks sit on the table. The counter and the
   list of recent markers used to live here too, but that's the output, not
   the controls — they're now only built when someone opens the session
   analysis. */
export function updateUI(pucks: Track[]): void {
    /* The grounding warning is installer language ("check the grounding")
     and belongs to calibrating the table, not to the conversation around it. */
    const flag = el("flag"),
        ground = DEV && touches.real.size >= 3 && !pucks.length;
    // A full storage takes priority: that costs someone their contribution,
    // the grounding warning costs at most one reading.
    if (pins.storageFull) {
        flag.style.display = "block";
        flag.innerHTML = tr("storageFull");
    } else {
        flag.style.display = ground ? "block" : "none";
        if (ground) flag.textContent = tr("groundFlag");
    }
    /* The analysis used to rebuild itself 6 times per second: buttons
     disappeared out from under a slow finger and the list jumped back to
     the top while you were reading. Now only when something actually
     changed. */
    if (
        el("analytics").classList.contains("open") &&
        analytics.revision !== pins.revision
    ) {
        analytics.revision = pins.revision;
        renderAnalytics();
    }
}
