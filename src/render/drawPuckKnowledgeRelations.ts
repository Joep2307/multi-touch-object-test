import { vColor } from "../i18n/vColor";
import { kg } from "../kg/kg";
import { nearby } from "../kg/nearby";
import { MV } from "../map/MV";
import { puckTopic } from "../puck/ring/puckTopic";
import { view } from "../state/view";
import type { Track } from "../types/Track";

/* When the knowledge graph is open, a puck also gets a visible relationship
   with what is known at that location. The three best-matching nodes keep
   the view legible; a thematic match is drawn as a solid, clear line, a
   purely proximity-based relation is subtly dashed. */
export function drawPuckKnowledgeRelations(
    ctx: CanvasRenderingContext2D,
    pucks: Track[],
): void {
    if (!kg.enabled || !kg.loaded || !pucks.length) return;
    const W = view.W,
        H = view.H;
    const visible = (x: number, y: number) =>
        x >= -24 && y >= -24 && x <= W + 24 && y <= H + 24;

    ctx.save();
    for (const puck of pucks) {
        if (puck.state !== "recognised" && puck.state !== "incomplete")
            continue;
        const ll = MV.unproject(puck.x, puck.y);
        const topic = puckTopic(puck);
        /* `nearby()` computes a haversine distance over every node in the
       graph. Doing that for every puck, every frame, is a hundred thousand
       calculations per second for three little lines that almost never
       change — and the discarded objects trigger a garbage-collection pause
       exactly when someone rotates a puck. So we cache it per puck, and only
       recalculate once it has moved about ten meters or its topic changed. */
        const key =
            ll.lat.toFixed(4) +
            "," +
            ll.lng.toFixed(4) +
            "|" +
            topic +
            "|" +
            kg.nodes.length;
        if (puck.kgKey !== key) {
            puck.kgKey = key;
            puck.kgRelations = nearby(ll.lat, ll.lng, {
                theme: topic,
                limit: 3,
                radiusM: 1200,
            });
        }
        const relations = puck.kgRelations || [];
        const color = vColor(puck.tpl.verdict);

        for (const relation of relations) {
            const target = MV.project(relation.node.lon, relation.node.lat);
            if (!visible(puck.x, puck.y) && !visible(target.x, target.y))
                continue;
            ctx.beginPath();
            ctx.moveTo(puck.x, puck.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = relation.match ? color + "bb" : color + "55";
            ctx.lineWidth = relation.match ? 2.5 : 1.25;
            ctx.setLineDash(relation.match ? [] : [5, 6]);
            ctx.stroke();
            ctx.setLineDash([]);

            // A ring makes it immediately clear, even on a busy map, which
            // graph node belongs to this puck, without replacing the normal
            // point.
            ctx.beginPath();
            ctx.arc(
                target.x,
                target.y,
                relation.match ? 9 : 6.5,
                0,
                Math.PI * 2,
            );
            ctx.strokeStyle = relation.match ? color : "rgba(232,237,244,.6)";
            ctx.lineWidth = relation.match ? 2 : 1;
            ctx.stroke();
        }
    }
    ctx.restore();
}
