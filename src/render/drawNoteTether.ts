import { CFG } from "../config/CFG";
import { vColor } from "../i18n/vColor";
import { openNotes } from "../notes/openNotes";
import { view } from "../state/view";
import type { NoteView } from "../types/NoteView";
import type { Track } from "../types/Track";

/* The note window is attached to one puck. Without a visible connection it
   just floats next to it, and with four pucks on the table there's no way to
   tell whose it is. A line from the edge of the puck to the nearest edge of
   the window, with a dot on the puck: the window is visibly attached to it.
   Drawn on the canvas, because the window itself clips away anything outside
   its edge. */
function drawOneTether(
    ctx: CanvasRenderingContext2D,
    pucks: Track[],
    v: NoteView,
): void {
    const n = v.el,
        pin = v.pin!;
    const t = pucks.find((p) => p.pinId === pin.id);
    if (!t) return;
    const r = n.getBoundingClientRect();
    if (!r.width) return;
    // Nearest point on the edge of the window: clamping is enough.
    const px = Math.max(r.left, Math.min(r.right, t.x)),
        py = Math.max(r.top, Math.min(r.bottom, t.y));
    const dx = px - t.x,
        dy = py - t.y,
        d = Math.hypot(dx, dy);
    const R = CFG.puckRadiusMM * view.pxPerMM;
    if (d <= R + 8) return; // window is right up against the puck
    const ux = dx / d,
        uy = dy / d,
        c = vColor(pin.verdict);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(t.x + ux * R, t.y + uy * R);
    ctx.lineTo(t.x + ux * (d - 1), t.y + uy * (d - 1));
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(
        t.x + ux * R,
        t.y + uy * R,
        Math.max(4, R * 0.065),
        0,
        Math.PI * 2,
    );
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = "rgba(7,9,12,.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

export function drawNoteTether(
    ctx: CanvasRenderingContext2D,
    pucks: Track[],
): void {
    for (const v of openNotes()) drawOneTether(ctx, pucks, v);
}
