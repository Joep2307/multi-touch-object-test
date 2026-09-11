import { CFG, CHIP_FAMILY, PUCK_HOLE } from "../config";
import { tr, vColor, vName } from "../i18n";
import { puckTapGlow, ringChosen, ringItems, ringStart } from "../puck/ring";
import { syncPlacedPinTopic } from "../puck";
import { CHIP, view } from "../state";
import { tableUi } from "../ui";
import { chipHeight } from "./chipHeight";
import { drawTarget } from "./drawTarget";
import type { Track } from "../types";

/* One puck on the table: the ring of choices, the pointer, the disc with
   viewing hole, the crosshair, and the texts in the band. */
export function drawPuck(
    ctx: CanvasRenderingContext2D,
    t: Track,
    now: number,
): void {
    const c = vColor(t.tpl.verdict),
        R = CFG.puckRadiusMM * view.pxPerMM;
    const items = ringItems(t),
        n = items.length;
    const chosen = ringChosen(t),
        glow = puckTapGlow(t, now);
    syncPlacedPinTopic(t);
    ctx.save();
    /* Dimmed while the table is not seeing all of it -- whether that is
     no reading at all (`incomplete`) or a reading with a foot worked out
     rather than measured (`held`). Both say the same thing to whoever is
     standing at the table, so both look the same. */
    ctx.globalAlpha = t.state === "incomplete" || t.held ? 0.35 : 1;
    for (let k = 0; t.ring && k < n; k++) {
        const item = items[k];
        if (!item) continue;
        const off = item.disabled;
        const a0 = ringStart(n) + (k / n) * Math.PI * 2 + 0.03,
            a1 = ringStart(n) + ((k + 1) / n) * Math.PI * 2 - 0.03;
        ctx.beginPath();
        ctx.arc(t.x, t.y, CFG.ringPX, a0, a1);
        ctx.strokeStyle = off ? c + "18" : k === chosen ? c : c + "44";
        ctx.lineWidth = off ? 2 : k === chosen ? 7 : 4;
        ctx.stroke();
        if (k === t.tapIdx && glow > 0) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, CFG.ringPX, a0, a1);
            ctx.strokeStyle = `rgba(255,255,255,${(glow * 0.9).toFixed(3)})`;
            ctx.lineWidth = 9;
            ctx.stroke();
        }
        const am = (a0 + a1) / 2,
            lr = CFG.ringPX + chipHeight() * 0.85;
        const lx = t.x + Math.cos(am) * lr,
            ly = t.y + Math.sin(am) * lr;
        const selected = k === chosen && !off;
        const label = item.label;
        // The same chip as a button in a panel: same size, same corners.
        // What's chosen differs in border and fill, not in size — a label
        // that grows as soon as you rotate past it would make the whole
        // ring dance.
        ctx.font =
            (selected ? "700 " : "600 ") +
            CHIP.font.toFixed(1) +
            "px " +
            CHIP_FAMILY;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Keep the option legible over detailed map tiles. A compact opaque
        // label also makes the active option much easier to spot from across
        // the table.
        const labelW = Math.ceil(ctx.measureText(label).width) + CHIP.padX * 2;
        const labelH = chipHeight();
        ctx.beginPath();
        ctx.roundRect(
            lx - labelW / 2,
            ly - labelH / 2,
            labelW,
            labelH,
            Math.min(CHIP.radius, labelH / 2),
        );
        ctx.fillStyle = selected ? "rgba(9,12,17,.98)" : "rgba(9,12,17,.88)";
        ctx.fill();
        ctx.strokeStyle = off
            ? "rgba(232,237,244,.12)"
            : selected
              ? c
              : "rgba(232,237,244,.28)";
        ctx.lineWidth = selected ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = off
            ? "rgba(232,237,244,.32)"
            : selected
              ? "#ffffff"
              : "rgba(232,237,244,.9)";
        ctx.fillText(label, lx, ly + 0.5);
        if (k === t.tapIdx && glow > 0) {
            ctx.beginPath();
            ctx.roundRect(
                lx - labelW / 2,
                ly - labelH / 2,
                labelW,
                labelH,
                Math.min(CHIP.radius, labelH / 2),
            );
            ctx.strokeStyle = `rgba(255,255,255,${(glow * 0.95).toFixed(3)})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
    ctx.textBaseline = "alphabetic";
    if (t.armed && t.state === "recognised") {
        const pulse = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(now / 380));
        ctx.beginPath();
        ctx.arc(t.x, t.y, R + 9, 0, Math.PI * 2);
        ctx.strokeStyle =
            c +
            Math.round(pulse * 255)
                .toString(16)
                .padStart(2, "0");
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 7]);
        ctx.lineDashOffset = -now / 45;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
    }
    if (t.flash > 0) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, R + 9 + (1 - t.flash) * 60, 0, Math.PI * 2);
        ctx.strokeStyle =
            c +
            Math.floor(t.flash * 200)
                .toString(16)
                .padStart(2, "0");
        ctx.lineWidth = 3;
        ctx.stroke();
        t.flash -= 0.04;
    }
    // The puck is a ring, not a disc: at its center is a viewing hole, so
    // the map stays visible under the crosshair. You see exactly where
    // you're pointing while you aim, instead of having to guess.
    const hole = R * PUCK_HOLE;
    ctx.fillStyle = "rgba(9,12,17,.94)";
    ctx.beginPath();
    ctx.arc(t.x, t.y, R, 0, Math.PI * 2);
    ctx.arc(t.x, t.y, hole, 0, Math.PI * 2, true);
    ctx.fill();
    // The outer ring carries the color of the verdict and must be readable
    // from a meter away, so it's bold; it stays within R so the puck radius
    // keeps being accurate.
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(3, R * 0.055);
    ctx.beginPath();
    ctx.arc(t.x, t.y, R - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    // A thin border around the hole keeps the transition to the map calm.
    ctx.strokeStyle = c + "66";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(t.x, t.y, hole, 0, Math.PI * 2);
    ctx.stroke();
    // The center of the puck stays clear for the crosshair; the texts move
    // out of the way.
    drawTarget(ctx, t.x, t.y, c, R);
    // The hole is bigger than the text can handle, so the text now sits in
    // the middle of the black band between the hole and the edge.
    const band = (hole + R) / 2;
    // The texts on the puck belong to the puck, not to a window: so they
    // scale with its radius and not with the UI scale.
    const nameSize = Math.max(12, R * 0.17),
        lineSize = Math.max(9, R * 0.115);
    ctx.textAlign = "center";
    ctx.fillStyle = c;
    ctx.font = "600 " + nameSize.toFixed(1) + "px " + CHIP_FAMILY;
    ctx.fillText(vName(t.tpl.verdict), t.x, t.y - band + nameSize * 0.34);
    // Both lines sit in the bottom half of the band, not in the hole: the
    // map and the crosshair are in the hole, and no text is legible there.
    ctx.font = "500 " + lineSize.toFixed(1) + "px " + CHIP_FAMILY;
    ctx.fillStyle = "rgba(232,237,244,.62)";
    const bandH = R - hole;
    ctx.fillText(
        t.ring
            ? tr("puckPickTopic")
            : t.armed
              ? tr(tableUi() ? "confirmTouch" : "confirmMouse")
              : tr("placed"),
        t.x,
        t.y + band + bandH * 0.12,
    );
    ctx.restore();
}
