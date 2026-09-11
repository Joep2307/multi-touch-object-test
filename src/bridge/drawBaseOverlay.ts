import { DirectionRay } from "../core/base";
import type { TrackBridge } from "./TrackBridge";

const MODEL_COLOUR = "#37e6ff";
const MODEL_FAINT = "rgba(55,230,255,.35)";
const CENTRE_RADIUS_PX = 8;
const CROSS_RADIUS_PX = 13;
const LINE_WIDTH_PX = 2;

/* Draws only diagnostic geometry. It never feeds values back into either
   pipeline, so enabling parity cannot change what the public table does. */
export function drawBaseOverlay(
    ctx: CanvasRenderingContext2D,
    bridge: TrackBridge,
    width: number,
    height: number,
    at: number,
): void {
    ctx.save();
    ctx.lineWidth = LINE_WIDTH_PX;
    for (const physical of bridge.all()) {
        const snapshot = physical.base.snapshot(at);
        const path = snapshot.motionHistory.points;
        if (path.length > 1) {
            const first = path[0];
            if (first !== undefined) {
                ctx.beginPath();
                ctx.moveTo(first.x, first.y);
                for (let index = 1; index < path.length; index += 1) {
                    const point = path[index];
                    if (point !== undefined) ctx.lineTo(point.x, point.y);
                }
                ctx.strokeStyle = MODEL_FAINT;
                ctx.stroke();
            }
        }

        const centre = snapshot.position.centre;
        if (centre === null) continue;
        if (snapshot.direction.known) {
            const ray = DirectionRay.fromHeading(
                centre,
                snapshot.direction.headingDeg,
            );
            const exit = ray.exitPoint({ width, height });
            if (exit !== null) {
                ctx.beginPath();
                ctx.moveTo(centre.x, centre.y);
                ctx.lineTo(exit.x, exit.y);
                ctx.strokeStyle = MODEL_FAINT;
                ctx.stroke();
            }
        }
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, CENTRE_RADIUS_PX, 0, Math.PI * 2);
        ctx.strokeStyle = MODEL_COLOUR;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centre.x - CROSS_RADIUS_PX, centre.y);
        ctx.lineTo(centre.x + CROSS_RADIUS_PX, centre.y);
        ctx.moveTo(centre.x, centre.y - CROSS_RADIUS_PX);
        ctx.lineTo(centre.x, centre.y + CROSS_RADIUS_PX);
        ctx.stroke();
    }
    ctx.restore();
}
