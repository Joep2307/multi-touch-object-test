import { PUCK_HOLE } from "../config/PUCK_HOLE";

/* Crosshair at the center point of a puck. That center point is the
   coordinate that gets recorded as the pin on confirm, so it must still be
   pinpointable from a meter away: a ring with four small ticks around it and
   a dot at the center. Everything scales with the puck radius `R`. */
export function drawTarget(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: string,
    R: number,
): void {
    // Sizes are tied to the viewing hole, not to the whole puck: if the hole
    // gets bigger, the crosshair grows with it and the proportions stay the
    // same.
    const hole = R * PUCK_HOLE;
    const ring = hole * 0.47,
        gap = hole * 0.2,
        arm = hole * 0.8;
    const draw = () => {
        ctx.beginPath();
        ctx.arc(x, y, ring, 0, Math.PI * 2);
        ctx.stroke();
        for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ]) {
            ctx.beginPath();
            ctx.moveTo(x + dx * gap, y + dy * gap);
            ctx.lineTo(x + dx * arm, y + dy * arm);
            ctx.stroke();
        }
    };
    ctx.save();
    ctx.lineCap = "round";
    // The hole lets the map show through, so the crosshair first gets a dark
    // outline underneath; otherwise it would disappear against a light part
    // of the map.
    ctx.strokeStyle = "rgba(9,12,17,.55)";
    ctx.lineWidth = 4;
    draw();
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.5;
    draw();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.5, R * 0.022), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
