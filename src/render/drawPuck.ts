import { CFG } from "../config/CFG";
import { CHIP_FAMILY } from "../config/CHIP_FAMILY";
import { PUCK_HOLE } from "../config/PUCK_HOLE";
import { tr } from "../i18n/tr";
import { vColor } from "../i18n/vColor";
import { vName } from "../i18n/vName";
import { MV } from "../map/MV";
import { puckDwellProgress } from "../puck/ring/puckDwellProgress";
import { ringChosen } from "../puck/ring/ringChosen";
import { ringIndexOf } from "../puck/ring/ringIndexOf";
import { ringItems } from "../puck/ring/ringItems";
import { ringStart } from "../puck/ring/ringStart";
import { syncPlacedPinTopic } from "../puck/syncPlacedPinTopic";
import { CHIP } from "../state/chip";
import { view } from "../state/view";
import type { Track } from "../types/Track";
import { tableUi } from "../ui/tableUi";
import { chipHeight } from "./chipHeight";
import { drawTarget } from "./drawTarget";

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
    const ti = ringIndexOf(t.angle, n),
        chosen = ringChosen(t);
    const dwell = puckDwellProgress(t, now);
    syncPlacedPinTopic(t);
    ctx.save();
    ctx.globalAlpha = t.state === "incomplete" ? 0.35 : 1;
    for (let k = 0; k < n; k++) {
        const item = items[k],
            off = item.disabled;
        const a0 = ringStart(n) + (k / n) * Math.PI * 2 + 0.03,
            a1 = ringStart(n) + ((k + 1) / n) * Math.PI * 2 - 0.03;
        // Three states on the ring, and they must be distinguishable from a
        // meter away: what the puck is currently pointing at (thick), what
        // has been chosen (solid), and what else there is to choose (thin).
        // Disabled is not invisible but faint: you must still be able to see
        // that the option exists.
        ctx.beginPath();
        ctx.arc(t.x, t.y, CFG.ringPX, a0, a1);
        ctx.strokeStyle = off
            ? c + "18"
            : k === chosen
              ? c
              : k === ti
                ? c + "88"
                : c + "33";
        ctx.lineWidth = off ? 2 : k === chosen ? 7 : k === ti ? 5 : 3;
        ctx.stroke();
        // The dwell that makes the choice fills up visibly. Without that
        // feedback, waiting feels like "nothing is happening".
        if (k === ti && dwell > 0) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, CFG.ringPX, a0, a0 + (a1 - a0) * dwell);
            ctx.strokeStyle = "rgba(255,255,255,.9)";
            ctx.lineWidth = 9;
            ctx.stroke();
        }
        const am = (a0 + a1) / 2,
            lr = CFG.ringPX + chipHeight() * 0.85;
        const lx = t.x + Math.cos(am) * lr,
            ly = t.y + Math.sin(am) * lr;
        const selected = k === ti && !off;
        const label = (k === chosen && !off ? "• " : "") + item.label;
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

        // Keep the option legible over detailed map tiles. A compact opaque label
        // also makes the active option much easier to spot from across the table.
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
              : k === chosen
                ? c + "88"
                : "rgba(232,237,244,.28)";
        ctx.lineWidth = selected ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = off
            ? "rgba(232,237,244,.32)"
            : selected
              ? "#ffffff"
              : "rgba(232,237,244,.9)";
        ctx.fillText(label, lx, ly + 0.5);
    }
    /* The pointer. The ring itself stays still and only the thick segment
     jumps to the next one, so nothing in the image changes until you're a
     whole segment further along — and then the table looks dead even though
     it's simply following you. This pointer sits at the measured angle and
     moves with every degree: you immediately see that you're being heard,
     and how far you still have to go to the next option. */
    {
        const na = t.angle,
            nr0 = R + 6,
            nr1 = CFG.ringPX - 7;
        ctx.save();
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(t.x + Math.cos(na) * nr0, t.y + Math.sin(na) * nr0);
        ctx.lineTo(t.x + Math.cos(na) * nr1, t.y + Math.sin(na) * nr1);
        ctx.strokeStyle = "rgba(7,9,12,.85)";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.92)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
            t.x + Math.cos(na) * nr1,
            t.y + Math.sin(na) * nr1,
            5,
            0,
            Math.PI * 2,
        );
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "rgba(7,9,12,.85)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
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
    // If the puck is in zoom mode, there are two lines in that band and they
    // shift apart around the center; otherwise this line stands alone.
    const bandH = R - hole;
    ctx.fillText(
        t.armed
            ? tr(tableUi() ? "confirmTouch" : "confirmMouse")
            : tr("placed"),
        t.x,
        t.y + band + bandH * (t.mode === "zoom" ? 0.28 : 0.12),
    );
    // Zooming is a modal state: someone who doesn't see that it's on will
    // accidentally push the map away. Moving is the resting state and says
    // nothing — that's already on the ring, and two lines stacked is too
    // busy.
    if (t.mode === "zoom") {
        ctx.font = "500 " + lineSize.toFixed(1) + "px " + CHIP_FAMILY;
        ctx.fillStyle = c;
        ctx.fillText(tr("modeZoom"), t.x, t.y + band - bandH * 0.22);
        // The anchor point stays still while the puck moves ahead. Without a
        // marker you wouldn't be able to see what the map is rotating
        // around; a small crosshair is enough, and only once the puck has
        // noticeably moved away from it.
        if (t.zoomAnchor) {
            const a = MV.project(t.zoomAnchor.lng, t.zoomAnchor.lat);
            if (Math.hypot(a.x - t.x, a.y - t.y) > R * 0.35) {
                ctx.strokeStyle = c;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(a.x, a.y, 7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(a.x - 12, a.y);
                ctx.lineTo(a.x - 9, a.y);
                ctx.moveTo(a.x + 9, a.y);
                ctx.lineTo(a.x + 12, a.y);
                ctx.moveTo(a.x, a.y - 12);
                ctx.lineTo(a.x, a.y - 9);
                ctx.moveTo(a.x, a.y + 9);
                ctx.lineTo(a.x, a.y + 12);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }
    ctx.restore();
}
