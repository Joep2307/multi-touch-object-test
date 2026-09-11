import type { Heat, KgEdge, KgNode, Lang } from "../types";
import type { BiblioClient } from "@biblio";

/* ═══════════════════════════════════════════════════════════════
   KNOWLEDGE GRAPH — the coco-biblio layer under the participation table
   ═══════════════════════════════════════════════════════════════
   The modules in src/kg/ are the only place that knows about the knowledge
   graph. The rest of the app asks them for points to draw, for what's known
   near a placement, and for an answer to what's said at the table.

   The connection comes from sturnia-node: `defaultClient` talks to
   coco-biblio's biblio API and falls back to exe/public/fixtures as soon as
   that backend is unreachable. So without a running Rust backend you see
   the fixture graph of Breda — the same area this table stands on. */
export const kg = {
    enabled: false, // draw the layer yes/no
    useThemes: false, // pull the puck's themes from the graph
    status: "off", // short line for the control panel; kept for compatibility
    statusKey: "off", // the same state as a key, so it can be translated
    statusArgs: [] as unknown[], // numbers to fill into that text
    nodes: [] as KgNode[], // only the nodes that have a coordinate
    themes: [] as string[], // theme labels from the graph
    themeOf: new Map<string, string[]>(), // node id → [theme, …]
    nodeById: new Map<string, KgNode>(), // id → node with a coordinate
    // id → Set(ids) — substantive relations.
    linksOf: new Map<string, Set<string>>(),
    edges: [] as KgEdge[], // relations where both ends have a place on the map
    relations: false, // show all relations at once, even without a selection
    grid: new Map<string, number>(), // cell key → number of nodes
    bounds: null as {
        mnLa: number;
        mxLa: number;
        mnLo: number;
        mxLo: number;
    } | null,
    gaps: false, // show the blank spots
    selected: null as KgNode | null, // tapped point on the map
    client: null as BiblioClient | null,
    baseUrl: "",
    loaded: false,
    /* The smoothed-out knowledge field, built once; null makes it rebuild. */
    heat: null as Heat | null,
    /* The graph speaks for itself in two places: the status line in the menu
     and the type label above a tapped point. They're translated here,
     because only these modules know when they change. */
    lang: "en" as Lang,
    /* Whoever wants to be notified when the graph loads or fails; see
       onKgChange. */
    listener: (() => {}) as () => void,
};
