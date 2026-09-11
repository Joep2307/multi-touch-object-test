import { CFG, CHIP_FAMILY } from "../config";
import { tr } from "../i18n";
import { CHIP, reset, view } from "../state";
import { doReset } from "../ui/resetKey";
import { sidesActive } from "../ui";
import { chipHeight } from "./chipHeight";
import { drawChip } from "./drawChip";

/* What happens while the reset button is held down. In the middle of the
   table, because that's where everyone looks the moment something changes;
   drawn twice, so it's upright on both sides. */
export function drawResetProgress(
    ctx: CanvasRenderingContext2D,
    now: number,
): void {
    if (!reset.heldAt) return;
    const p = Math.min(1, (now - reset.heldAt) / CFG.resetHoldMS);
    if (p >= 1) {
        doReset();
        return;
    }
    const r = Math.max(46, CFG.ringPX * 0.55),
        cx = view.W / 2,
        cy = view.H / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(9,12,17,.55)";
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.stroke();
    const label = tr("resetBusy");
    ctx.font = "600 " + CHIP.font.toFixed(1) + "px " + CHIP_FAMILY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const h = chipHeight();
    drawChip(ctx, label, cx, cy + r + h, false, "rgba(9,12,17,.92)");
    if (sidesActive())
        drawChip(ctx, label, cx, cy - r - h, true, "rgba(9,12,17,.92)");
    ctx.restore();
}
