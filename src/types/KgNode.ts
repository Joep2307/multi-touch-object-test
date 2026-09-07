/* A node from the knowledge graph that has a coordinate — only those get drawn. */
export interface KgNode {
    id: string;
    type: string;
    label: string;
    lat: number;
    lon: number;
    etype: string;
    year: number | null;
    themes: string[];
}
