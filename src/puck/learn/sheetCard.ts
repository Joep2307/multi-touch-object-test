import { tr } from "../../i18n";
import {
    codeSlots,
    codeText,
    gapText,
    isRing,
    isSlotted,
    padsFor,
    slotWidth,
    tplRing,
    tplSlots,
    tplSpanMM,
} from "../geometry";
import { tplColor } from "../tplColor";
import { tplLongest } from "../tplLongest";
import { tplName } from "../tplName";
import { tplRadiusMM } from "../tplRadiusMM";
import type { Template } from "../../types";

/* Nine letters: a grid puck has six feet, a ring five, a triangle three. */
const LETTERS = "ABCDEFGHI";
const S = 150;

/* One card of the build drawing: the puck's disc, its shape and the pad
   positions in millimetres from the centre. A grid puck also gets the whole
   grid drawn in -- the empty slots as short ticks -- because when you print
   it you have to see where the feet are *not*. */
export function sheetCard(t: Template): string {
    const span = tplSpanMM(t),
        pads = padsFor(t),
        sc = ((S * 0.34) / span) * 2;
    const pts = pads.map((p) => ({
            x: S / 2 + p.x * sc,
            y: S / 2 + p.y * sc,
        })),
        c = tplColor(t);
    const circle = (r: number): string =>
        `<circle cx="${S / 2}" cy="${S / 2}" r="${r.toFixed(1)}" ` +
        `fill="none" stroke="${c}" stroke-dasharray="3 3"/>`;
    let shape: string, rows: string;
    if (isSlotted(t)) {
        const n = tplSlots(t),
            w = slotWidth(n),
            R = tplRing(t) * sc;
        const ticks = Array.from({ length: n }, (_, i) => {
            const a = (i * w * Math.PI) / 180,
                on = codeSlots(t.code ?? 0, n).includes(i);
            const x1 = S / 2 + Math.cos(a) * R * 0.9,
                y1 = S / 2 + Math.sin(a) * R * 0.9,
                x2 = S / 2 + Math.cos(a) * R * 1.1,
                y2 = S / 2 + Math.sin(a) * R * 1.1;
            return (
                `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" ` +
                `x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ` +
                `stroke="${on ? c : "#2c3846"}"/>`
            );
        }).join("");
        shape = circle(R) + ticks;
        rows =
            `<tr><td>${tr("sheetCode")}</td><td colspan="2">` +
            `${codeText(t.code ?? 0, n)}</td></tr>
           <tr><td>${tr("sheetSlots")}</td><td colspan="2">${n} × ` +
            `${w.toFixed(0)}°</td></tr>
           <tr><td>${tr("sheetRing")}</td><td colspan="2">` +
            `${tplRing(t).toFixed(1)} mm</td></tr>`;
    } else if (isRing(t)) {
        shape = circle(tplRing(t) * sc);
        rows =
            `<tr><td>${tr("sheetGaps")}</td><td colspan="2">` +
            `${gapText(t.angles ?? [])}°</td></tr>
           <tr><td>${tr("sheetRing")}</td><td colspan="2">` +
            `${tplRing(t).toFixed(1)} mm</td></tr>`;
    } else {
        shape =
            `<polygon points="${pts
                .map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1))
                .join(" ")}" fill="none" stroke="${c}" ` +
            `stroke-dasharray="3 3"/>`;
        rows =
            `<tr><td>${tr("sheetRatios")}</td><td colspan="2">` +
            `${t.ratios?.[0]} / ${t.ratios?.[1]}</td></tr>
           <tr><td>${tr("sheetLongest")}</td><td colspan="2">` +
            `${tplLongest(t).toFixed(1)} mm</td></tr>`;
    }
    return (
        `<div class="sheetcard">` +
        `<h3 style="color:${c}">${t.id} · ${tplName(t)}</h3>
      <svg width="100%" viewBox="0 0 ${S} ${S}">
        <circle cx="${S / 2}" cy="${S / 2}" ` +
        `r="${tplRadiusMM(t) * sc}" fill="none" stroke="#2c3846"/>
        ${shape}
        ${pts
            .map(
                (p, i) =>
                    `<circle cx="${p.x.toFixed(1)}" ` +
                    `cy="${p.y.toFixed(1)}" r="5" fill="${c}"/>
        <text x="${(p.x + 9).toFixed(1)}" ` +
                    `y="${(p.y + 4).toFixed(1)}" font-size="10" ` +
                    `font-family="monospace" ` +
                    `fill="#7f8b9b">${LETTERS[i]}</text>`,
            )
            .join("")}
      </svg>
      <table>${pads
          .map(
              (p, i) =>
                  `<tr><td>${tr("sheetPad")} ${LETTERS[i]}</td>` +
                  `<td>x ${p.x.toFixed(1)} mm</td>` +
                  `<td>y ${p.y.toFixed(1)} mm</td></tr>`,
          )
          .join("")}
      ${rows}</table></div>`
    );
}
