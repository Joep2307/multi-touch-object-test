import { DirectionRay } from "../core/base";
import type { BaseSessionRecorder } from "./BaseSessionRecorder";
import type { ParityCheck } from "./ParityCheck";
import type { TrackBridge } from "./TrackBridge";

const MODEL_COLOUR = "#37e6ff";
const MODEL_FAINT = "rgba(55,230,255,.35)";
const TEXT_COLOUR = "rgba(255,255,255,.88)";
const CENTRE_RADIUS_PX = 8;
const CROSS_RADIUS_PX = 13;
const LINE_WIDTH_PX = 2;
const LABEL_X_PX = 18;
const LABEL_Y_PX = 28;
const LABEL_LINE_PX = 18;

/* Draws only diagnostic geometry. It never feeds values back into either
   pipeline, so enabling parity cannot change what the public table does. */
export function drawBaseOverlay(
    ctx: CanvasRenderingContext2D,
    bridge: TrackBridge,
    parity: ParityCheck,
    width: number,
    height: number,
    at: number,
    recorder: BaseSessionRecorder | null = null,
): void {
    ctx.save();
    ctx.lineWidth = LINE_WIDTH_PX;
    for (const physical of bridge.all()) {
        const snapshot = physical.base.snapshot(at);
        const tail = snapshot.tail.points;
        if (tail.length > 1) {
            const first = tail[0];
            if (first !== undefined) {
                ctx.beginPath();
                ctx.moveTo(first.x, first.y);
                for (let index = 1; index < tail.length; index += 1) {
                    const point = tail[index];
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
    /* Everything below has to be readable *on the glass*. The table
       runs as a kiosk: there is no console and no devtools, so a
       summary that is only logged may as well not exist. Worse,
       without an on-screen recording state there is no way to tell
       that Shift+Alt+R registered — you could record a whole session
       and capture nothing. */
    ctx.fillStyle = TEXT_COLOUR;
    ctx.font = "600 13px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const lines = [
        `Base parity: ${parity.divergenceCount}/${parity.frameCount}`,
        worstLine(parity),
    ];
    if (recorder !== null) {
        lines.push(
            recorder.recording
                ? `REC ● ${recorder.name} — ${recorder.frameCount} frames`
                : "not recording — Shift+Alt+R to start",
        );
    }
    lines.forEach((line, i) => {
        ctx.fillText(line, LABEL_X_PX, LABEL_Y_PX + i * LABEL_LINE_PX);
    });
    ctx.restore();
}

/* The worst disagreement, not the average. An average hides the one
   frame in a thousand where a puck jumped, and that frame is the bug —
   so it is the number worth putting where a person can read it. */
function worstLine(parity: ParityCheck): string {
    const worst = parity.worst();
    if (worst === null) return "worst: none — the two agree";
    if (worst.centreOffPX === null) {
        return `worst: only ${worst.seenByOld ? "old" : "new"} saw ${
            worst.trackId
        }`;
    }
    return `worst: ${worst.centreOffPX.toFixed(1)}px ${(
        worst.angleOffDeg ?? 0
    ).toFixed(1)}deg`;
}
