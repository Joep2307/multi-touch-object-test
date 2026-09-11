/* A copy of the canvas no wider than `maxW`, or null when there is
   nothing to copy yet. */
export function scaledCanvas(
    src: HTMLCanvasElement,
    maxW: number,
): HTMLCanvasElement | null {
    if (!src.width || !src.height) return null;
    const f = Math.min(1, maxW / src.width);
    const off = document.createElement("canvas");
    off.width = Math.max(2, Math.round(src.width * f));
    off.height = Math.max(2, Math.round(src.height * f));
    const g = off.getContext("2d");
    if (!g) return null;
    g.drawImage(src, 0, 0, off.width, off.height);
    return off;
}
