/* A tile in the cache, with what we know about its fate. */
export type TileImage = HTMLImageElement & {
    ok: boolean;
    bad?: boolean;
    badAt?: number;
};
