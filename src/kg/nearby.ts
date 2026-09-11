import { kg } from "./kg";
import { metersBetween } from "./metersBetween";
import type { NearbyHit } from "../types";

/* Nodes around a placement, closest first. A matching theme counts as a
   250 m bonus — it puts matching documents at the top without filtering
   out the rest, which is necessary because the six puck themes only
   partially overlap with the themes in the graph. */
export function nearby(
    lat: number,
    lon: number,
    {
        theme = "",
        limit = 5,
        radiusM = 1500,
    }: { theme?: string; limit?: number; radiusM?: number } = {},
): NearbyHit[] {
    const t = theme.trim().toLowerCase();
    return kg.nodes
        .map((n): NearbyHit => {
            const dist = metersBetween(lat, lon, n.lat, n.lon);
            const match = !!t && n.themes.some((x) => x.toLowerCase() === t);
            return { node: n, dist, match, rank: dist - (match ? 250 : 0) };
        })
        .filter((r) => r.dist <= radiusM)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, limit);
}
