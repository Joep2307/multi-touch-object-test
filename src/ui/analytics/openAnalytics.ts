import { el } from "../../dom";
import { closeNotes } from "../../notes";
import { analytics, menu, pins } from "../../state";
import { closeMenu } from "../menu";
import { sidesActive } from "../sidesActive";
import { applyAnalyticsOrientation } from "./applyAnalyticsOrientation";
import { renderAnalytics } from "./renderAnalytics";

export function openAnalytics(): void {
    // Save the origin before closeMenu() clears it: the overview should appear
    // at the same table edge and face the same reading direction as it.
    analytics.side = menu.side || "a";
    analytics.rotation = analytics.side === "b" && sidesActive() ? 180 : 0;
    closeMenu();
    closeNotes();
    analytics.revision = pins.revision;
    renderAnalytics();
    applyAnalyticsOrientation();
    const a = el("analytics");
    a.classList.add("open");
    a.scrollTop = 0;
    a.querySelector(".analytics-inner")!.scrollTop = 0;
}
