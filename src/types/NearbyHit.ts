import type { KgNode } from "./KgNode";

/* A node near a marker, with the distance and whether the topic matches.
   `rank` is the distance minus the topic bonus; that's what it's sorted by. */
export interface NearbyHit {
    node: KgNode;
    dist: number;
    match: boolean;
    rank: number;
}
