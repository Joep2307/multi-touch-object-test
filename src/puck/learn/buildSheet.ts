import { CFG } from "../../config/CFG";
import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { vColor } from "../../i18n/vColor";
import { vName } from "../../i18n/vName";
import { activeTemplates } from "../activeTemplates";
import { padsFor } from "../geometry/padsFor";
import { tplLongest } from "../tplLongest";

/* The blueprint: for each puck, the pad positions in millimeters from the center. */
export function buildSheet(): void {
    el("sheetGrid").innerHTML = activeTemplates()
        .map((t) => {
            const Lmm = tplLongest(t),
                pads = padsFor(t, Lmm),
                S = 150,
                sc = ((S * 0.34) / Lmm) * 2;
            const pts = pads.map((p) => ({
                    x: S / 2 + p.x * sc,
                    y: S / 2 + p.y * sc,
                })),
                c = vColor(t.verdict);
            return `<div class="sheetcard"><h3 style="color:${c}">${t.id} · ${vName(t.verdict)}</h3>
      <svg width="100%" viewBox="0 0 ${S} ${S}">
        <circle cx="${S / 2}" cy="${S / 2}" r="${CFG.puckRadiusMM * sc}" fill="none" stroke="#2c3846"/>
        <polygon points="${pts.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ")}" fill="none" stroke="${c}" stroke-dasharray="3 3"/>
        ${pts
            .map(
                (
                    p,
                    i,
                ) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${c}"/>
        <text x="${(p.x + 9).toFixed(1)}" y="${(p.y + 4).toFixed(1)}" font-size="10" font-family="monospace" fill="#7f8b9b">${"ABC"[i]}</text>`,
            )
            .join("")}
      </svg>
      <table>${pads.map((p, i) => `<tr><td>${tr("sheetPad")} ${"ABC"[i]}</td><td>x ${p.x.toFixed(1)} mm</td><td>y ${p.y.toFixed(1)} mm</td></tr>`).join("")}
      <tr><td>${tr("sheetRatios")}</td><td colspan="2">${t.ratios[0]} / ${t.ratios[1]}</td></tr>
      <tr><td>${tr("sheetLongest")}</td><td colspan="2">${Lmm.toFixed(1)} mm</td></tr></table></div>`;
        })
        .join("");
}
