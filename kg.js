/* ═══════════════════════════════════════════════════════════════
   KENNISGRAAF — de coco-biblio laag onder de participatietafel
   ═══════════════════════════════════════════════════════════════
   Deze module is de enige plek die de knowledge graph kent. app.js vraagt
   hem om punten om te tekenen en om een treffer bij een tik; verder weet
   app.js niets van biblio af.

   De koppeling zelf komt uit sturnia-node: `defaultClient` praat met de
   biblio-API van coco-biblio en valt terug op de fixtures in public/fixtures
   zodra die backend niet bereikbaar is. Zonder draaiende Rust-backend zie je
   dus de fixture-graaf van Breda — precies het gebied waar deze tafel op
   staat ingesteld.
*/
import { defaultClient } from "@biblio";

export const kg = {
  enabled: false,      // laag tekenen ja/nee
  useThemes: false,    // thema's van de puck uit de graaf halen
  status: "uit",       // korte tekst voor het bedieningspaneel
  nodes: [],           // alleen de knopen mét coördinaat
  themes: [],          // themalabels uit de graaf
  selected: null,      // aangetikte knoop
  baseUrl: "",
};

let onChange = () => {};
export function onKgChange(fn) { onChange = fn; }

const NODE_COLOR = {
  document: "#7aa2f7",
  entity: "#c89bf5",
};

/* De graaf is een momentopname: één keer ophalen, daarna alleen nog
   projecteren. Panning en zoomen raken de data niet. */
export async function loadKG(baseUrl = "") {
  kg.baseUrl = baseUrl;
  kg.status = "laden…";
  onChange();
  try {
    const client = defaultClient({
      baseUrl: baseUrl || undefined,
      fixtures: "fixtures",
    });
    const g = await client.graph(["documents", "entities", "themes"]);
    kg.nodes = g.nodes
      .filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lon))
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        lat: n.lat,
        lon: n.lon,
        etype: n.etype || "",
        year: n.year ?? null,
      }));
    kg.themes = g.nodes.filter((n) => n.type === "theme").map((n) => n.label);
    kg.status = kg.nodes.length
      ? `${kg.nodes.length} punten · ${kg.themes.length} thema's`
      : "graaf zonder coördinaten";
  } catch (e) {
    console.warn("[kg] laden mislukt:", e);
    kg.nodes = [];
    kg.themes = [];
    kg.status = "niet bereikbaar";
  }
  onChange();
}

/* Alleen tekenen wat op het scherm valt — bij 400+ punten scheelt dat merkbaar. */
export function drawKG(ctx, MV, W, H) {
  if (!kg.enabled || !kg.nodes.length) return;
  for (const n of kg.nodes) {
    const s = MV.project(n.lon, n.lat);
    if (s.x < -20 || s.y < -20 || s.x > W + 20 || s.y > H + 20) continue;
    const c = NODE_COLOR[n.type] || "#8b93a7";
    const on = kg.selected === n;
    ctx.beginPath();
    ctx.arc(s.x, s.y, on ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle = on ? c : c + "cc";
    ctx.fill();
    ctx.strokeStyle = "rgba(7,9,12,.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (on) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

/* Bovenste knoop onder een tik. Ruimere straal dan de stip zelf, want dit
   wordt met een vinger op een 43"-scherm aangewezen. */
export function kgAt(MV, x, y) {
  if (!kg.enabled) return null;
  let best = null, bestD = 18;
  for (const n of kg.nodes) {
    const s = MV.project(n.lon, n.lat);
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bestD) { best = n; bestD = d; }
  }
  return best;
}

const TYPE_LABEL = { document: "document", entity: "entiteit", theme: "thema" };

export function kgDescribe(n) {
  const bits = [TYPE_LABEL[n.type] || n.type];
  if (n.etype) bits.push(n.etype);
  if (n.year) bits.push(String(n.year));
  return bits.join(" · ");
}
