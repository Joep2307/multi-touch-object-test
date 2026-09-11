import { cellOf } from "./cellOf";
import { kgStatusText } from "./kgStatusText";
import { kg } from "./kg";
import { defaultClient } from "@biblio";
import type { KgNode } from "../types";

/* ── Loading ────────────────────────────────────────────────────────────
   The graph is a snapshot: fetched once, after that only projected.
   Panning and zooming don't touch the data. */
export async function loadKG(baseUrl = ""): Promise<void> {
    kg.baseUrl = baseUrl;
    kg.statusKey = "loading";
    kg.statusArgs = [];
    kg.status = kgStatusText();
    kg.loaded = false;
    kg.listener();
    try {
        /* Een leeg adres is geen adres: dan wordt het veld weggelaten
           in plaats van op `undefined` gezet, zodat de client zijn
           eigen standaard kiest. */
        kg.client = defaultClient(
            baseUrl === ""
                ? { fixtures: "fixtures" }
                : { baseUrl, fixtures: "fixtures" },
        );
        const g = await kg.client.graph(["documents", "entities", "themes"]);

        const label = new Map(g.nodes.map((n) => [n.id, n.label]));
        const themeIds = new Set(
            g.nodes.filter((n) => n.type === "theme").map((n) => n.id),
        );
        kg.themeOf = new Map();
        for (const l of g.links || []) {
            if (l.type !== "has_theme" && l.type !== "entity_theme") continue;
            // The theme side of the link is the node that's in the theme
            // list; the contract shape usually puts that on `target`, but
            // not always.
            const [subject, theme] = themeIds.has(l.target)
                ? [l.source, label.get(l.target)]
                : [l.target, label.get(l.source)];
            if (!theme) continue;
            if (!kg.themeOf.has(subject)) kg.themeOf.set(subject, []);
            kg.themeOf.get(subject)!.push(theme);
        }

        kg.nodes = g.nodes
            .filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lon))
            .map((n): KgNode => ({
                id: n.id,
                type: n.type,
                label: n.label,
                lat: n.lat as number,
                lon: n.lon as number,
                etype: n.etype || "",
                year: n.year ?? null,
                themes: kg.themeOf.get(n.id) || [],
            }));
        kg.themes = g.nodes
            .filter((n) => n.type === "theme")
            .map((n) => n.label);

        kg.nodeById = new Map(kg.nodes.map((n) => [n.id, n]));

        // Substantive relations: a document that mentions a place, and
        // places that relate to each other. We skip `has_theme`/
        // `has_keyword` — those connect everything to everything and only
        // produce a web.
        kg.linksOf = new Map();
        const join = (a: string, b: string) => {
            if (!kg.linksOf.has(a)) kg.linksOf.set(a, new Set());
            kg.linksOf.get(a)!.add(b);
        };
        for (const l of g.links || []) {
            if (l.type !== "mentions" && l.type !== "related") continue;
            join(l.source, l.target);
            join(l.target, l.source);
        }

        /* What you can actually draw from those relations is a lot less
       than what's in the graph: only documents and places have a
       coordinate, people, organizations and concepts don't. Of the
       mentions, that leaves roughly a sixth; of the related lines, almost
       nothing. Those drawable lines are prepared here once — deduplicated,
       since a relation is the same line in both directions. */
        const seenEdge = new Set<string>();
        kg.edges = [];
        for (const l of g.links || []) {
            if (l.type !== "mentions" && l.type !== "related") continue;
            const a = kg.nodeById.get(l.source),
                b = kg.nodeById.get(l.target);
            if (!a || !b || a === b) continue;
            const key = a.id < b.id ? a.id + "|" + b.id : b.id + "|" + a.id;
            if (seenEdge.has(key)) continue;
            seenEdge.add(key);
            kg.edges.push({ a, b, type: l.type });
        }

        // Knowledge density per grid cell, plus the area the graph actually
        // says anything about — outside of that, "nothing known" isn't a
        // finding.
        kg.grid = new Map();
        let mnLa = Infinity,
            mxLa = -Infinity,
            mnLo = Infinity,
            mxLo = -Infinity;
        for (const n of kg.nodes) {
            const k = cellOf(n.lat, n.lon);
            kg.grid.set(k, (kg.grid.get(k) || 0) + 1);
            if (n.lat < mnLa) mnLa = n.lat;
            if (n.lat > mxLa) mxLa = n.lat;
            if (n.lon < mnLo) mnLo = n.lon;
            if (n.lon > mxLo) mxLo = n.lon;
        }
        kg.bounds = kg.nodes.length ? { mnLa, mxLa, mnLo, mxLo } : null;
        kg.heat = null; // force the field to rebuild

        kg.loaded = true;
        kg.statusKey = kg.nodes.length ? "counts" : "noCoords";
        kg.statusArgs = kg.nodes.length
            ? [kg.nodes.length, kg.themes.length]
            : [];
        kg.status = kgStatusText();
    } catch (e) {
        console.warn("[kg] laden mislukt:", e);
        kg.nodes = [];
        kg.themes = [];
        kg.loaded = false;
        kg.nodeById = new Map();
        kg.linksOf = new Map();
        kg.edges = [];
        kg.grid = new Map();
        kg.bounds = null;
        kg.statusKey = "unreachable";
        kg.statusArgs = [];
        kg.status = kgStatusText();
    }
    kg.listener();
}
