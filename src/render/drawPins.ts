import { CHIP_FAMILY } from "../config/CHIP_FAMILY";
import { vColor } from "../i18n/vColor";
import { MV } from "../map/MV";
import { noteViewFor } from "../notes/noteViewFor";
import { pins } from "../state/pins";
import { touches } from "../state/touches";
import { ui } from "../state/ui";
import { view } from "../state/view";

/* The pins on the map. */
export function drawPins(ctx: CanvasRenderingContext2D): void {
    const W = view.W,
        H = view.H;
    for (const p of pins.list) {
        const s = MV.project(p.lng, p.lat);
        if (s.x < -40 || s.y < -40 || s.x > W + 40 || s.y > H + 40) continue;
        const c = vColor(p.verdict);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 17, 0, Math.PI * 2);
        ctx.fillStyle = c + "22";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.strokeStyle = "rgba(7,9,12,.85)";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (ui.pinMoveMode) {
            const dragging = touches.pinDrag?.pin === p;
            ctx.beginPath();
            ctx.arc(s.x, s.y, dragging ? 27 : 23, 0, Math.PI * 2);
            ctx.strokeStyle = dragging ? "#fff" : c;
            ctx.lineWidth = dragging ? 3 : 2;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        if (p.title || p.description || p.note) {
            ctx.fillStyle = "#07090c";
            ctx.font = "700 11px " + CHIP_FAMILY;
            ctx.textAlign = "center";
            ctx.fillText("•", s.x, s.y + 3.5);
        }
        if (noteViewFor(p)) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
            ctx.strokeStyle = "#e8edf4";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
}
