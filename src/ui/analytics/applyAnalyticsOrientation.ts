import { el } from "../../dom";
import { tr } from "../../i18n";
import { analytics } from "../../state";

export function applyAnalyticsOrientation(): void {
    const a = el("analytics");
    a.classList.toggle("at-a", analytics.side === "a");
    a.classList.toggle("at-b", analytics.side === "b");
    a.classList.toggle("quarter-turn", analytics.rotation % 180 !== 0);
    a.style.setProperty("--analytics-flip", analytics.rotation + "deg");
    el("flipAnalytics").setAttribute("aria-label", tr("rotateQuarter"));
    el("flipAnalytics").title = tr("rotateQuarter");
}
