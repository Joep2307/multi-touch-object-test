import { el } from "../../dom";
import type { Point } from "../../types";

/* The measured triangle is drawn over the map: that way you can immediately
   see whether the table sees all three stickers, and in the right place. */
export function drawLearnPoints(pts: Point[]): void {
    const svg = el("learnPoints");
    const poly =
        pts.length === 3
            ? `<polygon points="${pts
                  .map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1))
                  .join(" ")}"/>`
            : "";
    const html =
        poly +
        pts
            .map(
                (p) =>
                    `<circle cx="${p.x.toFixed(1)}" ` +
                    `cy="${p.y.toFixed(1)}" r="15"/>`,
            )
            .join("");
    if (svg.dataset.h === html) return;
    svg.dataset.h = html;
    svg.innerHTML = html;
}
