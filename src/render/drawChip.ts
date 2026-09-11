import { CHIP } from "../state";
import { chipHeight } from "./chipHeight";

/* A yellow notification chip in the middle of the table — used for "Card is
   locked" and the reset ring. `turn` flips it upside down for the opposite
   side. The caller has already set the font, so the width can be measured. */
export function drawChip(
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number,
    turn: boolean,
    alpha: string,
): void {
    const h = chipHeight(),
        w = Math.ceil(ctx.measureText(label).width) + CHIP.padX * 2;
    ctx.save();
    ctx.translate(x, y);
    if (turn) ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(CHIP.radius, h / 2));
    ctx.fillStyle = alpha;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,209,102,.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.fillText(label, 0, 0.5);
    ctx.restore();
}
