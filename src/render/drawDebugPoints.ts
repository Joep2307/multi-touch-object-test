import type { TouchPoint } from "../types";

/* Touch debug: each contact point with its number, green if it's part of a
   puck. */
export function drawDebugPoints(
    ctx: CanvasRenderingContext2D,
    points: TouchPoint[],
    usedIdx: Set<number>,
): void {
    points.forEach((pt, i) => {
        ctx.strokeStyle = usedIdx.has(i) ? "#39d8a4" : "#ff5f56";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = "10px 'JetBrains Mono',ui-monospace,monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText((pt.sim ? "sim " : "id ") + i, pt.x + 20, pt.y + 3);
    });
}
