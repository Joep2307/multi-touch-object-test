import { TILE_SETS } from "../config";
import { tiles } from "../state";
import { MV } from "./MV";
import { tileChanged } from "./tileChanged";
import type { TileImage } from "../types";

export function getTile(z: number, x: number, y: number): TileImage | null {
    const set = TILE_SETS[MV.set];
    if (!set) return null;
    if (z > set.max) return null; // source doesn't go deeper; fill with parent
    const key = MV.set + "/" + z + "/" + x + "/" + y;
    let img = tiles.cache.get(key) ?? null;
    /* A tile that failed once used to stay a permanent hole in the map: a
     five-second network hiccup became a hole that persisted until someone
     switched map views. Now it may be retried after half a minute. */
    if (img && img.bad && performance.now() - (img.badAt || 0) > 30000) {
        tiles.cache.delete(key);
        img = null;
    }
    if (img) {
        // Most recently used goes to the back: this way the area the table
        // pans around all day survives, instead of being the first to be
        // evicted.
        tiles.cache.delete(key);
        tiles.cache.set(key, img);
    }
    if (!img) {
        const src = set.url
            .replace("{s}", "abc"[(x + y) % 3] ?? "a")
            .replace("{z}", String(z))
            .replace("{x}", String(x))
            .replace("{y}", String(y));
        const setName = MV.set,
            cors = !tiles.tainted.has(setName);
        const fresh = new Image() as TileImage;
        fresh.ok = false;
        if (cors) fresh.crossOrigin = "anonymous";
        fresh.onload = () => {
            fresh.ok = true;
            tileChanged();
        };
        fresh.onerror = () => {
            if (cors && tiles.cache.get(key) === fresh) {
                // Second chance without CORS. A fresh Image, because setting
                // the same src again doesn't always make the browser re-fetch
                // it.
                tiles.tainted.add(setName);
                const retry = new Image() as TileImage;
                retry.ok = false;
                retry.onload = () => {
                    retry.ok = true;
                    tileChanged();
                };
                retry.onerror = () => {
                    retry.bad = true;
                    retry.badAt = performance.now();
                    tiles.failed++;
                    tileChanged();
                };
                retry.src = src;
                tiles.cache.set(key, retry);
                return;
            }
            fresh.bad = true;
            fresh.badAt = performance.now();
            tiles.failed++;
            tileChanged();
        };
        fresh.src = src;
        tiles.cache.set(key, fresh);
        tiles.tried++;
        img = fresh;
        /* 1600 decoded tiles is hundreds of megabytes of image memory in a
       browser that keeps running all day, and it used to be the oldest-added
       tile that got evicted — not the least recently used one. Now it's a
       real LRU, and smaller. */
        while (tiles.cache.size > 600) {
            const k = tiles.cache.keys().next().value;
            if (k === undefined) break;
            tiles.cache.delete(k);
        }
    }
    return img.ok ? img : null;
}
