import { getTile } from "./getTile";
import { peekTile } from "./peekTile";

/* Draw one tile slot. If its own tile isn't loaded yet, fill the slot from whatever
   is already cached — a patch of a coarser parent tile (zoom-in) or the four finer
   child tiles (zoom-out) — so the map never flashes empty while zooming. */
export function blitCovered(
    g: CanvasRenderingContext2D,
    z: number,
    x: number,
    y: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
): boolean {
    const img = getTile(z, x, y);
    if (img) {
        g.drawImage(img, rx, ry, rw, rh);
        return true;
    }
    for (let d = 1; d <= 6 && z - d >= 0; d++) {
        const f = 1 << d,
            a = peekTile(z - d, Math.floor(x / f), Math.floor(y / f));
        if (a) {
            const s = 256 / f;
            g.drawImage(a, (x % f) * s, (y % f) * s, s, s, rx, ry, rw, rh);
            return true;
        }
    }
    const kids = [
        peekTile(z + 1, x * 2, y * 2),
        peekTile(z + 1, x * 2 + 1, y * 2),
        peekTile(z + 1, x * 2, y * 2 + 1),
        peekTile(z + 1, x * 2 + 1, y * 2 + 1),
    ];
    if (kids.some(Boolean)) {
        const hw = rw / 2,
            hh = rh / 2,
            off = [
                [0, 0],
                [hw, 0],
                [0, hh],
                [hw, hh],
            ];
        kids.forEach((k, i) => {
            if (k)
                g.drawImage(k, rx + off[i][0], ry + off[i][1], hw + 1, hh + 1);
        });
        return kids.every(Boolean);
    }
    return false;
}
