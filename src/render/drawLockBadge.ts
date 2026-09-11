import { CHIP_FAMILY } from "../config";
import { tr } from "../i18n";
import { CHIP, ui, view } from "../state";
import { sidesActive } from "../ui";
import { chipHeight } from "./chipHeight";
import { drawChip } from "./drawChip";

/* A locked card used to only leave a trace in the menu — that is, in the one
   window you close before touching the card. Someone who can no longer move
   it afterwards thinks the table has frozen. A border around the view and a
   chip on both long sides say so without getting in the way. */
export function drawLockBadge(ctx: CanvasRenderingContext2D): void {
    if (!ui.mapLocked) return;
    const W = view.W,
        H = view.H;
    const label = tr("locked");
    ctx.save();
    ctx.setLineDash([9, 7]);
    ctx.strokeStyle = "rgba(255,209,102,.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 7, W - 14, H - 14);
    ctx.setLineDash([]);
    ctx.font = "600 " + CHIP.font.toFixed(1) + "px " + CHIP_FAMILY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const h = chipHeight();
    drawChip(ctx, label, W / 2, H - 16 - h / 2, false, "rgba(9,12,17,.9)");
    if (sidesActive())
        drawChip(ctx, label, W / 2, 16 + h / 2, true, "rgba(9,12,17,.9)");
    ctx.restore();
}
