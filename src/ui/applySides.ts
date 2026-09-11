import { el } from "../dom";
import { ui } from "../state";
import { sidesActive } from "./sidesActive";

/* ── Two sides ─────────────────────────────────────────────────────────
   A table lies flat and people stand around it; what's upright for one
   person is upside down for another. We leave the map alone — that's the
   shared object, just like a paper map you also don't rotate separately
   for everyone. But what's personal and temporary does rotate along: the
   window appears facing the reading direction of the edge the touch came
   from. */
export function applySides(): void {
    document.body.classList.toggle("two-sided", sidesActive());
    el("btnSides").classList.toggle("on", ui.twoSided);
    el("btnSides").setAttribute("aria-pressed", String(ui.twoSided));
    try {
        localStorage.setItem("pucktable-two-sided", ui.twoSided ? "1" : "0");
    } catch (e) {}
}
