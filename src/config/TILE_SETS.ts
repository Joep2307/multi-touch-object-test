import type { TileSet } from "../types/TileSet";

/* Map views. Each view is a different reading of the same city: where the
   green is, where things are built, how traffic flows. `max` is the
   deepest zoom level the source provides — beyond that we stop requesting
   tiles and blitCovered() fills the gap with an enlarged parent tile,
   which looks better than blank areas. `credit` appears at the bottom of
   the screen; the sources below require that attribution.

   PDOK belongs to the Kadaster and is open; the OSM variants run on
   voluntarily funded servers, so this is fine for a prototype on one
   table but not for something that pulls tens of thousands of tiles all
   day long. */
export const TILE_SETS: Record<string, TileSet | null> = {
    osm: {
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        max: 19,
        credit: "© OpenStreetMap contributors — openstreetmap.org/copyright",
    },
    brt: {
        url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png",
        max: 19,
        credit: "© Kadaster / PDOK — BRT Achtergrondkaart",
    },
    brtgrijs: {
        url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png",
        max: 19,
        credit: "© Kadaster / PDOK — BRT Achtergrondkaart (grijs)",
    },
    brtpastel: {
        url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/pastel/EPSG:3857/{z}/{x}/{y}.png",
        max: 19,
        credit: "© Kadaster / PDOK — BRT Achtergrondkaart (pastel)",
    },
    water: {
        url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/water/EPSG:3857/{z}/{x}/{y}.png",
        max: 19,
        credit: "© Kadaster / PDOK — BRT Achtergrondkaart (water)",
    },
    lucht: {
        url: "https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg",
        max: 19,
        credit: "© Kadaster / Beeldmateriaal.nl — luchtfoto 25 cm",
    },
    groen: {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        max: 17,
        credit: "© OpenStreetMap contributors · SRTM · OpenTopoMap (CC-BY-SA)",
    },
    bebouwing: {
        url: "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        max: 19,
        credit: "© OpenStreetMap contributors · Humanitarian OSM Team",
    },
    verkeer: {
        url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
        max: 18,
        credit: "© OpenStreetMap contributors · CyclOSM",
    },
    dark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        max: 19,
        credit: "© OpenStreetMap contributors · © CARTO",
    },
    light: {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        max: 19,
        credit: "© OpenStreetMap contributors · © CARTO",
    },
    none: null,
};
