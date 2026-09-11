import { MV } from "../map";
import { view } from "../state";
import { CELL } from "./CELL";
import { buildHeat } from "./buildHeat";
import { kg } from "./kg";

export function drawGaps(ctx: CanvasRenderingContext2D): void {
    if (!kg.gaps || !kg.bounds) return;
    if (!kg.heat) kg.heat = buildHeat();
    const heat = kg.heat;
    if (!heat) return;
    const nw = MV.project(heat.gx0 * CELL.LON, (heat.gy1 + 1) * CELL.LAT);
    const se = MV.project((heat.gx1 + 1) * CELL.LON, heat.gy0 * CELL.LAT);
    if (se.x < 0 || se.y < 0 || nw.x > view.W || nw.y > view.H) return;
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(heat.cv, nw.x, nw.y, se.x - nw.x, se.y - nw.y);
    ctx.imageSmoothingEnabled = prev;
}
