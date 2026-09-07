import { MV } from "../map/MV";
import { view } from "../state/view";
import { NODE_COLOR } from "./NODE_COLOR";
import { kg } from "./kg";

/* ── Drawing ────────────────────────────────────────────────────────────
   Only what falls on screen — at 400+ points that makes a noticeable
   difference. */
export function drawKG(ctx: CanvasRenderingContext2D): void {
    if (!kg.enabled || !kg.nodes.length) return;
    const W = view.W,
        H = view.H;

    /* The whole web at once, if the layer is on. Fine, translucent lines:
     what matters is where it gets dense, not exactly which line runs where
     — for that you tap a point. Documents that mention a place are blue,
     places that relate to each other are purple; the latter are drawn on
     top because there are few of them. */
    if (kg.relations && kg.edges.length) {
        ctx.save();
        for (const kind of ["mentions", "related"]) {
            ctx.lineWidth = kind === "related" ? 1.4 : 1;
            ctx.strokeStyle =
                kind === "related"
                    ? "rgba(200,155,245,.50)"
                    : "rgba(122,162,247,.14)";
            ctx.beginPath();
            for (const e of kg.edges) {
                if (e.type !== kind) continue;
                const p = MV.project(e.a.lon, e.a.lat),
                    q = MV.project(e.b.lon, e.b.lat);
                if (
                    Math.max(p.x, q.x) < 0 ||
                    Math.max(p.y, q.y) < 0 ||
                    Math.min(p.x, q.x) > W ||
                    Math.min(p.y, q.y) > H
                )
                    continue;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    // Connections from the tapped point: which places and documents relate
    // to each other. Only when there's a selection, otherwise it's a web.
    if (kg.selected) {
        const from = MV.project(kg.selected.lon, kg.selected.lat);
        ctx.save();
        ctx.strokeStyle = "rgba(122,162,247,.42)";
        ctx.lineWidth = 1.2;
        for (const id of kg.linksOf.get(kg.selected.id) || []) {
            const other = kg.nodeById.get(id);
            if (!other) continue; // no coordinate, nothing to draw
            const to = MV.project(other.lon, other.lat);
            if (
                Math.max(from.x, to.x) < 0 ||
                Math.max(from.y, to.y) < 0 ||
                Math.min(from.x, to.x) > W ||
                Math.min(from.y, to.y) > H
            )
                continue;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(to.x, to.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(122,162,247,.9)";
            ctx.fill();
        }
        ctx.restore();
    }

    for (const n of kg.nodes) {
        const s = MV.project(n.lon, n.lat);
        if (s.x < -20 || s.y < -20 || s.x > W + 20 || s.y > H + 20) continue;
        const c = NODE_COLOR[n.type] || "#8b93a7";
        const on = kg.selected === n;
        ctx.beginPath();
        ctx.arc(s.x, s.y, on ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle = on ? c : c + "cc";
        ctx.fill();
        ctx.strokeStyle = "rgba(7,9,12,.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (on) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
            ctx.strokeStyle = c;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
}
