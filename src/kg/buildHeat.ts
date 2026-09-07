import type { Heat } from "../types/Heat";
import { CELL } from "./CELL";
import { kg } from "./kg";

/* ── Blank spots as a heat map ────────────────────────────────────────
   Where the city has written a lot about itself, and where nothing. Only
   within the area the graph actually says something about: outside of
   that, "no documents" means nothing more than that it's outside Breda.

   It's the scarcity that gets colored, not the density. That's the
   inversion that makes the map useful at the table: you see at a glance
   where nobody has recorded anything, and so where the question is worth
   the most.

   Technique: the field is built once as a tiny canvas of one pixel per
   grid cell, in geographic space. When drawing, that image is scaled over
   the map; the browser interpolates the pixels, which produces smooth
   blobs instead of boxes. Panning and zooming therefore cost nothing —
   the field itself never changes along with them. */
function blurField(
    src: Float32Array,
    cols: number,
    rows: number,
    passes = 3,
    r = 2,
): Float32Array {
    const a = src,
        b = new Float32Array(cols * rows);
    for (let p = 0; p < passes; p++) {
        for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++) {
                // horizontal
                let sum = 0,
                    n = 0;
                for (let d = -r; d <= r; d++) {
                    const xx = x + d;
                    if (xx < 0 || xx >= cols) continue;
                    sum += a[y * cols + xx];
                    n++;
                }
                b[y * cols + x] = sum / n;
            }
        for (let x = 0; x < cols; x++)
            for (let y = 0; y < rows; y++) {
                // vertical
                let sum = 0,
                    n = 0;
                for (let d = -r; d <= r; d++) {
                    const yy = y + d;
                    if (yy < 0 || yy >= rows) continue;
                    sum += b[yy * cols + x];
                    n++;
                }
                a[y * cols + x] = sum / n;
            }
    }
    return a;
}

export function buildHeat(): Heat | null {
    if (!kg.bounds) return null;
    const { mnLa, mxLa, mnLo, mxLo } = kg.bounds;
    // Generous margin: the support field below smears out ~12 cells, so the
    // field needs to run far enough to be able to drop to zero outside the
    // city. That outer border is fully transparent and therefore costs
    // nothing.
    const M = 18;
    const gy0 = Math.floor(mnLa / CELL.LAT) - M,
        gy1 = Math.floor(mxLa / CELL.LAT) + M;
    const gx0 = Math.floor(mnLo / CELL.LON) - M,
        gx1 = Math.floor(mxLo / CELL.LON) + M;
    const cols = gx1 - gx0 + 1,
        rows = gy1 - gy0 + 1;
    if (cols < 2 || rows < 2) return null;

    const field = new Float32Array(cols * rows);
    const seen = new Float32Array(cols * rows);
    for (const [key, n] of kg.grid) {
        const [gy, gx] = key.split(",").map(Number);
        const x = gx - gx0,
            y = gy - gy0;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        field[y * cols + x] += n;
        seen[y * cols + x] = 1;
    }
    const dens = blurField(field, cols, rows, 3, 2);

    /* Support field: how close is this cell to the area where the dataset
     says anything at all? A much wider smearing of "something is here",
     regardless of how much. That makes the heat fade out naturally outside
     the city, while a gap right in the middle of the documents lights up
     fully. Without this you get a glowing rectangle around Breda — the
     edge of the dataset, not a lack of knowledge. */
    const sup = blurField(seen, cols, rows, 3, 7);

    let max = 0,
        smax = 0;
    for (const v of dens) if (v > max) max = v;
    for (const v of sup) if (v > smax) smax = v;
    if (!max || !smax) return null;

    const cv = document.createElement("canvas");
    cv.width = cols;
    cv.height = rows;
    const g = cv.getContext("2d")!;
    const img = g.createImageData(cols, rows);
    // Row 0 of the field is the southernmost, row 0 of an image is the
    // topmost — so mirror it when writing out, otherwise the map ends up
    // upside down.
    for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
            const scarce = 1 - Math.min(1, dens[y * cols + x] / max);
            // Below half, enough is known; above it the color runs from amber
            // to red and gradually becomes more opaque.
            const t = Math.max(0, (scarce - 0.45) / 0.55);
            const fade = Math.min(1, sup[y * cols + x] / (smax * 0.3));
            const p = ((rows - 1 - y) * cols + x) * 4;
            img.data[p] = 255;
            img.data[p + 1] = Math.round(209 - 114 * t); // 209 → 95
            img.data[p + 2] = Math.round(102 - 16 * t); // 102 → 86
            img.data[p + 3] = Math.round(Math.pow(t, 1.3) * 135 * fade);
        }
    g.putImageData(img, 0, 0);
    // The grid's y-axis runs north, the image's runs south: keep track of
    // which corner belongs where.
    return { cv, gx0, gy0, gx1, gy1, cols, rows };
}
