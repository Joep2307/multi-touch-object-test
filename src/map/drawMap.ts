import { CFG, CHIP_FAMILY, TILE_SETS } from "../config";
import { tr } from "../i18n";
import { tiles, ui, view } from "../state";
import { CALM_FILTER } from "./CALM_FILTER";
import { MV } from "./MV";
import { blitCovered } from "./blitCovered";

/* The map layer: tiles, any pinned-down image, the message shown when
   nothing is coming in, the scale bar, and the attribution. */
export function drawMap(g: CanvasRenderingContext2D): void {
    const W = view.W,
        H = view.H,
        light = ui.colorTheme === "light";
    g.fillStyle = light ? "#e8edf3" : "#0b0e13";
    g.fillRect(0, 0, W, H);
    let drawn = 0;
    const rotation = (MV.north * Math.PI) / 180,
        c = Math.abs(Math.cos(rotation)),
        s = Math.abs(Math.sin(rotation));
    const coverW = W * c + H * s,
        coverH = W * s + H * c;
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(rotation);
    g.translate(-W / 2, -H / 2);
    if (ui.calmMap && "filter" in g) g.filter = CALM_FILTER;

    const bg = tiles.bgImage;
    if (bg) {
        const nw = MV.projectRaw(bg.west, bg.north),
            se = MV.projectRaw(bg.east, bg.south);
        g.drawImage(bg.img, nw.x, nw.y, se.x - nw.x, se.y - nw.y);
        drawn = 1;
    }

    const z = Math.max(0, Math.min(19, Math.round(MV.zoom) + CFG.retina));
    const scale = Math.pow(2, MV.zoom - z),
        ts = 256 * scale,
        n = Math.pow(2, z);
    const centerX = MV.wx(MV.lng),
        centerY = MV.wy(MV.lat);
    const x0 = Math.floor((centerX - coverW / 2) / ts),
        x1 = Math.floor((centerX + coverW / 2) / ts);
    const y0 = Math.max(0, Math.floor((centerY - coverH / 2) / ts)),
        y1 = Math.min(n - 1, Math.floor((centerY + coverH / 2) / ts));
    for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++) {
            const wrapped = ((tx % n) + n) % n;
            // snap every edge to a whole pixel so neighbouring tiles butt
            // together with no seam and no half-pixel blur
            const rx = Math.round(tx * ts - centerX + W / 2),
                ry = Math.round(ty * ts - centerY + H / 2);
            const rw = Math.round((tx + 1) * ts - centerX + W / 2) - rx,
                rh = Math.round((ty + 1) * ts - centerY + H / 2) - ry;
            if (blitCovered(g, z, wrapped, ty, rx, ry, rw, rh)) drawn++;
            else if (!bg) {
                g.strokeStyle = light
                    ? "rgba(115,129,147,.42)"
                    : "rgba(28,35,45,.9)";
                g.lineWidth = 1;
                g.strokeRect(rx, ry, rw, rh);
            }
        }
    if ("filter" in g) g.filter = "none";
    g.restore();

    if (!drawn && MV.set !== "none") {
        const msg = tiles.failed > 0 ? tr("tileBlocked") : tr("tileLoading");
        g.textAlign = "center";
        g.fillStyle = "rgba(14,18,24,.92)";
        g.fillRect(W / 2 - 320, 22, 640, 52);
        g.strokeStyle = "rgba(255,209,102,.4)";
        g.lineWidth = 1;
        g.strokeRect(W / 2 - 320, 22, 640, 52);
        g.fillStyle = "#ffd166";
        g.font = "13px 'Space Grotesk',system-ui,sans-serif";
        g.fillText(msg, W / 2, 46);
        g.fillStyle = "rgba(127,139,155,.9)";
        g.font = "12px " + CHIP_FAMILY;
        g.fillText(tr("tilesFoot", tiles.tried, tiles.failed), W / 2, 64);
    }
    // scale bar + attribution
    const mPerPx =
        (156543.03392 * Math.cos((MV.lat * Math.PI) / 180)) /
        Math.pow(2, MV.zoom);
    let barM = Math.pow(10, Math.floor(Math.log10(mPerPx * 140)));
    if ((barM * 2) / mPerPx < 160) barM *= 2;
    const barPx = barM / mPerPx;
    g.strokeStyle = light ? "rgba(23,32,45,.7)" : "rgba(232,237,244,.6)";
    g.lineWidth = 2;
    const barX = 88; // right of the map-layers button
    g.beginPath();
    g.moveTo(barX, H - 26);
    g.lineTo(barX + barPx, H - 26);
    g.moveTo(barX, H - 31);
    g.lineTo(barX, H - 21);
    g.moveTo(barX + barPx, H - 31);
    g.lineTo(barX + barPx, H - 21);
    g.stroke();
    g.fillStyle = light ? "rgba(23,32,45,.72)" : "rgba(232,237,244,.6)";
    g.font = "11px 'JetBrains Mono',ui-monospace,monospace";
    g.textAlign = "left";
    g.fillText(barM >= 1000 ? barM / 1000 + " km" : barM + " m", barX, H - 36);
    g.textAlign = "center";
    g.fillStyle = light ? "rgba(54,68,85,.76)" : "rgba(127,139,155,.75)";
    g.font = "11px " + CHIP_FAMILY;
    g.fillText(TILE_SETS[MV.set]?.credit || "", W / 2, H - 10);
}
