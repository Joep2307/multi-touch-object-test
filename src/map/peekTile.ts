import { tiles } from "../state/tiles";
import type { TileImage } from "../types/TileImage";
import { MV } from "./MV";

/* Cache lookup only — never starts a download. */
export function peekTile(z: number, x: number, y: number): TileImage | null {
    if (z < 0) return null;
    const img = tiles.cache.get(MV.set + "/" + z + "/" + x + "/" + y);
    return img && img.ok ? img : null;
}
