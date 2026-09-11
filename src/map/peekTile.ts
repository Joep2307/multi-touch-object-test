import { tiles } from "../state";
import { MV } from "./MV";
import type { TileImage } from "../types";

/* Cache lookup only — never starts a download. */
export function peekTile(z: number, x: number, y: number): TileImage | null {
    if (z < 0) return null;
    const img = tiles.cache.get(MV.set + "/" + z + "/" + x + "/" + y);
    return img && img.ok ? img : null;
}
