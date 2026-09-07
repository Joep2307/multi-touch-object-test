import { tiles } from "../state/tiles";
import type { BasemapRecord } from "../types/BasemapRecord";

export function showBasemap(rec: BasemapRecord | null | undefined): void {
    if (!rec || !rec.data) return;
    const img = new Image();
    img.onload = () => {
        tiles.bgImage = {
            img,
            west: rec.west,
            north: rec.north,
            east: rec.east,
            south: rec.south,
        };
    };
    img.src = rec.data;
}
