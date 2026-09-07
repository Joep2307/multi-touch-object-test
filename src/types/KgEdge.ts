import type { KgNode } from "./KgNode";

/* A drawable relation: both endpoints are on the map. */
export interface KgEdge {
    a: KgNode;
    b: KgNode;
    type: string;
}
