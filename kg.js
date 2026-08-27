/* ═══════════════════════════════════════════════════════════════
   KENNISGRAAF — de coco-biblio laag onder de participatietafel
   ═══════════════════════════════════════════════════════════════
   Deze module is de enige plek die de knowledge graph kent. app.js vraagt
   hem om punten om te tekenen, om wat er in de buurt van een markering
   bekend is, en om een antwoord op wat er aan tafel gezegd wordt.

   De koppeling komt uit sturnia-node: `defaultClient` praat met de
   biblio-API van coco-biblio en valt terug op public/fixtures zodra die
   backend niet bereikbaar is. Zonder draaiende Rust-backend zie je dus de
   fixture-graaf van Breda — hetzelfde gebied waar deze tafel op staat.
*/
import { defaultClient } from "@biblio";

export const kg = {
  enabled: false,      // laag tekenen ja/nee
  useThemes: false,    // thema's van de puck uit de graaf halen
  status: "uit",       // korte tekst voor het bedieningspaneel
  nodes: [],           // alleen de knopen mét coördinaat
  themes: [],          // themalabels uit de graaf
  themeOf: new Map(),  // knoop-id → [thema, …]
  selected: null,      // aangetikt punt op de kaart
  client: null,
  baseUrl: "",
  loaded: false,
};

let onChange = () => {};
export function onKgChange(fn) { onChange = fn; }

const NODE_COLOR = { document: "#7aa2f7", entity: "#c89bf5" };

/* ── Laden ──────────────────────────────────────────────────────────────
   De graaf is een momentopname: één keer ophalen, daarna alleen nog
   projecteren. Panning en zoomen raken de data niet. */
export async function loadKG(baseUrl = "") {
  kg.baseUrl = baseUrl;
  kg.status = "laden…";
  kg.loaded = false;
  onChange();
  try {
    kg.client = defaultClient({ baseUrl: baseUrl || undefined, fixtures: "fixtures" });
    const g = await kg.client.graph(["documents", "entities", "themes"]);

    const label = new Map(g.nodes.map((n) => [n.id, n.label]));
    const themeIds = new Set(g.nodes.filter((n) => n.type === "theme").map((n) => n.id));
    kg.themeOf = new Map();
    for (const l of g.links || []) {
      if (l.type !== "has_theme" && l.type !== "entity_theme") continue;
      // De themakant van de link is de knoop die in de themalijst staat;
      // de contractvorm zet die meestal op `target`, maar niet altijd.
      const [subject, theme] = themeIds.has(l.target)
        ? [l.source, label.get(l.target)]
        : [l.target, label.get(l.source)];
      if (!theme) continue;
      if (!kg.themeOf.has(subject)) kg.themeOf.set(subject, []);
      kg.themeOf.get(subject).push(theme);
    }

    kg.nodes = g.nodes
      .filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lon))
      .map((n) => ({
        id: n.id, type: n.type, label: n.label,
        lat: n.lat, lon: n.lon,
        etype: n.etype || "", year: n.year ?? null,
        themes: kg.themeOf.get(n.id) || [],
      }));
    kg.themes = g.nodes.filter((n) => n.type === "theme").map((n) => n.label);
    kg.loaded = true;
    kg.status = kg.nodes.length
      ? `${kg.nodes.length} punten · ${kg.themes.length} thema's`
      : "graaf zonder coördinaten";
  } catch (e) {
    console.warn("[kg] laden mislukt:", e);
    kg.nodes = []; kg.themes = []; kg.loaded = false;
    kg.status = "niet bereikbaar";
  }
  onChange();
}

/* Zorgt dat de graaf geladen is zonder hem per se te tekenen — het
   notitievenster heeft de data nodig, ook als de laag uit staat. */
let pending = null;
export function ensureKG(baseUrl = "") {
  if (kg.loaded) return Promise.resolve();
  if (!pending) pending = loadKG(baseUrl).finally(() => { pending = null; });
  return pending;
}

/* ── Tekenen ────────────────────────────────────────────────────────────
   Alleen wat op het scherm valt — bij 400+ punten scheelt dat merkbaar. */
export function drawKG(ctx, MV, W, H) {
  if (!kg.enabled || !kg.nodes.length) return;
  for (const n of kg.nodes) {
    const s = MV.project(n.lon, n.lat);
    if (s.x < -20 || s.y < -20 || s.x > W + 20 || s.y > H + 20) continue;
    const c = NODE_COLOR[n.type] || "#8b93a7";
    const on = kg.selected === n;
    ctx.beginPath(); ctx.arc(s.x, s.y, on ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle = on ? c : c + "cc"; ctx.fill();
    ctx.strokeStyle = "rgba(7,9,12,.7)"; ctx.lineWidth = 1.5; ctx.stroke();
    if (on) {
      ctx.beginPath(); ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke();
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

/* ── Wat is hier bekend? ────────────────────────────────────────────────
   Afstand in meters over het aardoppervlak. Op stadsschaal is de fout van
   deze bolbenadering verwaarloosbaar. */
function metersBetween(lat1, lon1, lat2, lon2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* Knopen rond een markering, dichtstbij eerst. Een thema dat overeenkomt
   telt als een bonus van 250 m — het zet passende documenten bovenaan
   zonder de rest weg te filteren, wat nodig is omdat de zes puck-thema's
   maar deels overlappen met de thema's in de graaf. */
export function nearby(lat, lon, { theme = "", limit = 5, radiusM = 1500 } = {}) {
  const t = theme.trim().toLowerCase();
  return kg.nodes
    .map((n) => {
      const dist = metersBetween(lat, lon, n.lat, n.lon);
      const match = !!t && n.themes.some((x) => x.toLowerCase() === t);
      return { node: n, dist, match, rank: dist - (match ? 250 : 0) };
    })
    .filter((r) => r.dist <= radiusM)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
}

export function formatDistance(m) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

/* De vraag die de tafel aan de graaf stelt. Alles wat de RAG-zoeker nodig
   heeft zit erin: wat er gezegd is, waar, onder welk thema, en welke
   documenten daar in de buurt liggen. */
export function buildQuestion({ title, description, topic, verdictName, place, near }) {
  const said = [title, description].filter(Boolean).join(" — ") || "(geen toelichting gegeven)";
  const docs = near.filter((r) => r.node.type === "document")
                   .map((r) => `"${r.node.label}" (${formatDistance(r.dist)})`);
  return [
    `Aan een participatietafel in Breda is bij ${place} het volgende gezegd: "${said}".`,
    `Thema: ${topic}. Aard van de opmerking: ${verdictName}.`,
    docs.length ? `Documenten in de directe omgeving: ${docs.join(", ")}.` : "",
    `Vraag: wat is er in het beleid en de documenten over deze plek en dit thema bekend, en welke oplossing of vervolgstap volgt daaruit? Antwoord kort en in het Nederlands, en verwijs naar de documenten waar je je op baseert.`,
  ].filter(Boolean).join(" ");
}

/* Stuurt de vraag naar POST /api/biblio/chat en levert de tokens terwijl ze
   binnenkomen. Zonder backend (of zonder Ollama erachter) valt de client
   terug op fixtures/chat.txt — dan is het antwoord een voorbeeldantwoord,
   geen echte analyse. `onSources` krijgt de fragmenten waar het op steunt. */
export async function ask(question, { onToken, onSources, signal } = {}) {
  if (!kg.client) throw new Error("kennisgraaf nog niet geladen");
  let text = "";
  for await (const ev of kg.client.chat(question, [], signal)) {
    if (ev.event === "sources") onSources?.(ev.data);
    else if (ev.event === "token") { text += ev.data.text; onToken?.(text); }
    else if (ev.event === "error") throw new Error(ev.data.message || ev.data.error || "chat mislukt");
    else if (ev.event === "done") break;
  }
  return text;
}
