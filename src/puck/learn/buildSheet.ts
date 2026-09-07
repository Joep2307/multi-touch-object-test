import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { activeTemplates } from "../activeTemplates";
import { gapText } from "../geometry/gapText";
import { isRing } from "../geometry/isRing";
import { padsFor } from "../geometry/padsFor";
import { tplRing } from "../geometry/tplRing";
import { tplSpanMM } from "../geometry/tplSpanMM";
import { tplColor } from "../tplColor";
import { tplLongest } from "../tplLongest";
import { tplName } from "../tplName";
import { tplRadiusMM } from "../tplRadiusMM";

/* The blueprint: for each puck, the pad positions in millimetres from the
   centre -- a ring drawn as its circle, a taped puck as its triangle. */
export function buildSheet(): void {
    el("sheetGrid").innerHTML = activeTemplates()
        .map((t) => {
            const span = tplSpanMM(t),
                pads = padsFor(t),
                S = 150,
                sc = ((S * 0.34) / span) * 2;
            const pts = pads.map((p) => ({
                    x: S / 2 + p.x * sc,
                    y: S / 2 + p.y * sc,
                })),
                c = tplColor(t);
            const shape = isRing(t)
                ? `<circle cx="${S / 2}" cy="${S / 2}" r="${(tplRing(t) * sc).toFixed(1)}" fill="none" stroke="${c}" stroke-dasharray="3 3"/>`
                : `<polygon points="${pts.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ")}" fill="none" stroke="${c}" stroke-dasharray="3 3"/>`;
            const rows = isRing(t)
                ? `<tr><td>${tr("sheetGaps")}</td><td colspan="2">${gapText(t.angles ?? [])}°</td></tr>
           <tr><td>${tr("sheetRing")}</td><td colspan="2">${tplRing(t).toFixed(1)} mm</td></tr>`
                : `<tr><td>${tr("sheetRatios")}</td><td colspan="2">${t.ratios?.[0]} / ${t.ratios?.[1]}</td></tr>
           <tr><td>${tr("sheetLongest")}</td><td colspan="2">${tplLongest(t).toFixed(1)} mm</td></tr>`;
            return `<div class="sheetcard"><h3 style="color:${c}">${t.id} · ${tplName(t)}</h3>
      <svg width="100%" viewBox="0 0 ${S} ${S}">
        <circle cx="${S / 2}" cy="${S / 2}" r="${tplRadiusMM(t) * sc}" fill="none" stroke="#2c3846"/>
        ${shape}
        ${pts
            .map(
                (p, i) =>
                    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${c}"/>
        <text x="${(p.x + 9).toFixed(1)}" y="${(p.y + 4).toFixed(1)}" font-size="10" font-family="monospace" fill="#7f8b9b">${"ABCDE"[i]}</text>`,
            )
            .join("")}
      </svg>
      <table>${pads.map((p, i) => `<tr><td>${tr("sheetPad")} ${"ABCDE"[i]}</td><td>x ${p.x.toFixed(1)} mm</td><td>y ${p.y.toFixed(1)} mm</td></tr>`).join("")}
      ${rows}</table></div>`;
        })
        .join("");
}
