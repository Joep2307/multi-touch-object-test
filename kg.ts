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
  status: "uit",       // korte tekst voor het bedieningspaneel (Nederlands, historisch)
  statusKey: "off",    // dezelfde stand als sleutel, zodat hij te vertalen is
  statusArgs: [],      // getallen die in die tekst worden ingevuld
  nodes: [],           // alleen de knopen mét coördinaat
  themes: [],          // themalabels uit de graaf
  themeOf: new Map(),  // knoop-id → [thema, …]
  nodeById: new Map(),  // id → knoop mét coördinaat
  linksOf: new Map(),   // id → Set(ids) — inhoudelijke relaties
  edges: [],            // relaties waarvan beide uiteinden op de kaart staan
  relations: false,     // alle relaties tegelijk tonen, ook zonder selectie
  grid: new Map(),      // celsleutel → aantal knopen
  bounds: null,         // gebied waarover de graaf iets zegt
  gaps: false,          // witte vlekken tonen
  selected: null,       // aangetikt punt op de kaart
  client: null,
  baseUrl: "",
  loaded: false,
};

/* Rastercel voor de kennisdichtheid. 0.002° breedtegraad is ~222 m; op 51,6°
   is een lengtegraad nog maar 62% van een breedtegraad, dus de lengte-stap
   moet groter om vierkante cellen te krijgen. Deze cellen zijn alleen de
   meetkorrel — wat je ziet is een uitgesmeerd veld, geen hokjes. */
const CELL_LAT = 0.002, CELL_LON = 0.002 / Math.cos(51.6 * Math.PI / 180);
const cellOf = (lat, lon) => Math.floor(lat / CELL_LAT) + "," + Math.floor(lon / CELL_LON);

let onChange = () => {};
export function onKgChange(fn) { onChange = fn; }

/* ── Taal ────────────────────────────────────────────────────────────────
   De graaf spreekt op twee plekken zelf: de statusregel in het menu en het
   soortlabel boven een aangetikt punt. Ze worden hier vertaald in plaats van
   in app.js, omdat alleen dit bestand weet wanneer ze veranderen. De status
   bewaart een sleutel in plaats van een zin, zodat een taalwissel achteraf
   ook een regel raakt die al een tijd op het scherm staat. */
let kgLang = "nl";
export function setKgLang(l) { kgLang = l === "en" ? "en" : "nl"; }
const KL = {
  nl: { off: "uit", loading: "laden…", unreachable: "niet bereikbaar",
        noCoords: "graaf zonder coördinaten",
        counts: (n, m) => `${n} punten · ${m} thema's`,
        document: "document", entity: "entiteit", theme: "thema" },
  en: { off: "off", loading: "loading…", unreachable: "unreachable",
        noCoords: "graph without coordinates",
        counts: (n, m) => `${n} points · ${m} themes`,
        document: "document", entity: "entity", theme: "theme" },
};
const kl = (k, ...a) => {
  const v = KL[kgLang][k] !== undefined ? KL[kgLang][k] : KL.nl[k];
  if (v === undefined) return k;
  return typeof v === "function" ? v(...a) : v;
};
/* De statusregel in de taal van nu. */
export function kgStatusText() { return kl(kg.statusKey, ...(kg.statusArgs || [])); }

const NODE_COLOR = { document: "#7aa2f7", entity: "#c89bf5" };

/* ── Laden ──────────────────────────────────────────────────────────────
   De graaf is een momentopname: één keer ophalen, daarna alleen nog
   projecteren. Panning en zoomen raken de data niet. */
export async function loadKG(baseUrl = "") {
  kg.baseUrl = baseUrl;
  kg.statusKey = "loading"; kg.statusArgs = []; kg.status = kgStatusText();
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

    kg.nodeById = new Map(kg.nodes.map((n) => [n.id, n]));

    // Inhoudelijke relaties: een document dat een plek noemt, en plekken die
    // met elkaar te maken hebben. `has_theme`/`has_keyword` slaan we over —
    // die verbinden alles met alles en leveren alleen een web op.
    kg.linksOf = new Map();
    const join = (a, b) => {
      if (!kg.linksOf.has(a)) kg.linksOf.set(a, new Set());
      kg.linksOf.get(a).add(b);
    };
    for (const l of g.links || []) {
      if (l.type !== "mentions" && l.type !== "related") continue;
      join(l.source, l.target);
      join(l.target, l.source);
    }

    /* Wat je van die relaties daadwerkelijk kunt tekenen is een stuk minder
       dan wat er in de graaf staat: alleen documenten en plekken hebben een
       coördinaat, personen, organisaties en begrippen niet. Van de mentions
       blijft daardoor ongeveer een zesde over, van de related-lijnen bijna
       niets. Die tekenbare lijnen worden hier één keer klaargelegd — ontdubbeld,
       want een relatie is heen en terug dezelfde lijn. */
    const seenEdge = new Set();
    kg.edges = [];
    for (const l of g.links || []) {
      if (l.type !== "mentions" && l.type !== "related") continue;
      const a = kg.nodeById.get(l.source), b = kg.nodeById.get(l.target);
      if (!a || !b || a === b) continue;
      const key = a.id < b.id ? a.id + "|" + b.id : b.id + "|" + a.id;
      if (seenEdge.has(key)) continue;
      seenEdge.add(key);
      kg.edges.push({ a, b, type: l.type });
    }

    // Kennisdichtheid per rastercel, plus het gebied waarover de graaf
    // überhaupt iets zegt — daarbuiten is "niets bekend" geen bevinding.
    kg.grid = new Map();
    let mnLa = Infinity, mxLa = -Infinity, mnLo = Infinity, mxLo = -Infinity;
    for (const n of kg.nodes) {
      const k = cellOf(n.lat, n.lon);
      kg.grid.set(k, (kg.grid.get(k) || 0) + 1);
      if (n.lat < mnLa) mnLa = n.lat;
      if (n.lat > mxLa) mxLa = n.lat;
      if (n.lon < mnLo) mnLo = n.lon;
      if (n.lon > mxLo) mxLo = n.lon;
    }
    kg.bounds = kg.nodes.length ? { mnLa, mxLa, mnLo, mxLo } : null;
    heat = null;                                   // veld opnieuw laten bouwen

    kg.loaded = true;
    kg.statusKey = kg.nodes.length ? "counts" : "noCoords";
    kg.statusArgs = kg.nodes.length ? [kg.nodes.length, kg.themes.length] : [];
    kg.status = kgStatusText();
  } catch (e) {
    console.warn("[kg] laden mislukt:", e);
    kg.nodes = []; kg.themes = []; kg.loaded = false;
    kg.nodeById = new Map(); kg.linksOf = new Map(); kg.edges = [];
    kg.grid = new Map(); kg.bounds = null;
    kg.statusKey = "unreachable"; kg.statusArgs = []; kg.status = kgStatusText();
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

/* ── Witte vlekken als warmtekaart ─────────────────────────────────────
   Waar de stad veel over zichzelf heeft opgeschreven, en waar niets. Alleen
   binnen het gebied waarover de graaf iets zegt: daarbuiten betekent "geen
   documenten" niets meer dan dat het buiten Breda ligt.

   Het is de schaarste die kleur krijgt, niet de dichtheid. Dat is de
   omkering die de kaart bruikbaar maakt aan tafel: je ziet in één oogopslag
   waar niemand iets heeft vastgelegd, en dus waar de vraag het meeste waard
   is.

   Techniek: het veld wordt één keer gebouwd als een piepklein canvas van één
   pixel per rastercel, in geografische ruimte. Bij het tekenen wordt dat
   beeld over de kaart geschaald; de browser interpoleert de pixels, en dat
   levert vloeiende vlekken op in plaats van hokjes. Pannen en zoomen kosten
   daardoor niets — het veld verandert immers niet mee. */
let heat = null;

function blurField(src, cols, rows, passes = 3, r = 2) {
  let a = src, b = new Float32Array(cols * rows);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {      // horizontaal
      let sum = 0, n = 0;
      for (let d = -r; d <= r; d++) {
        const xx = x + d; if (xx < 0 || xx >= cols) continue;
        sum += a[y * cols + xx]; n++;
      }
      b[y * cols + x] = sum / n;
    }
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {      // verticaal
      let sum = 0, n = 0;
      for (let d = -r; d <= r; d++) {
        const yy = y + d; if (yy < 0 || yy >= rows) continue;
        sum += b[yy * cols + x]; n++;
      }
      a[y * cols + x] = sum / n;
    }
  }
  return a;
}

function buildHeat() {
  if (!kg.bounds) return null;
  const { mnLa, mxLa, mnLo, mxLo } = kg.bounds;
  // Ruime marge: het draagvlak hieronder smeert ~12 cellen ver uit, dus het
  // veld moet ver genoeg doorlopen om buiten de stad naar nul te kunnen
  // zakken. Die buitenrand is volledig doorzichtig en kost dus niets.
  const M = 18;
  const gy0 = Math.floor(mnLa / CELL_LAT) - M, gy1 = Math.floor(mxLa / CELL_LAT) + M;
  const gx0 = Math.floor(mnLo / CELL_LON) - M, gx1 = Math.floor(mxLo / CELL_LON) + M;
  const cols = gx1 - gx0 + 1, rows = gy1 - gy0 + 1;
  if (cols < 2 || rows < 2) return null;

  const field = new Float32Array(cols * rows);
  const seen = new Float32Array(cols * rows);
  for (const [key, n] of kg.grid) {
    const [gy, gx] = key.split(",").map(Number);
    const x = gx - gx0, y = gy - gy0;
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
    field[y * cols + x] += n;
    seen[y * cols + x] = 1;
  }
  const dens = blurField(field, cols, rows, 3, 2);

  /* Draagvlak: hoe dicht zit deze cel bij het gebied waar de dataset iets
     zegt? Een veel wijdere uitsmering van "hier staat iets", los van hoevéél.
     Daarmee vervaagt de warmte buiten de stad vanzelf, terwijl een gat midden
     tussen de documenten juist volledig oplicht. Zonder dit krijg je een
     gloeiende rechthoek om Breda heen — de rand van de dataset, niet een
     gebrek aan kennis. */
  const sup = blurField(seen, cols, rows, 3, 7);

  let max = 0, smax = 0;
  for (const v of dens) if (v > max) max = v;
  for (const v of sup) if (v > smax) smax = v;
  if (!max || !smax) return null;

  const cv = document.createElement("canvas");
  cv.width = cols; cv.height = rows;
  const g = cv.getContext("2d");
  const img = g.createImageData(cols, rows);
  // Rij 0 van het veld is de zuidelijkste, rij 0 van een afbeelding de
  // bovenste — dus spiegelen bij het wegschrijven, anders staat de kaart
  // ondersteboven.
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const scarce = 1 - Math.min(1, dens[y * cols + x] / max);
    // Onder de helft is er genoeg bekend; daarboven loopt de kleur van amber
    // naar rood en wordt hij geleidelijk dekkender.
    const t = Math.max(0, (scarce - 0.45) / 0.55);
    const fade = Math.min(1, sup[y * cols + x] / (smax * 0.3));
    const p = ((rows - 1 - y) * cols + x) * 4;
    img.data[p]     = 255;
    img.data[p + 1] = Math.round(209 - 114 * t);   // 209 → 95
    img.data[p + 2] = Math.round(102 - 16 * t);    // 102 → 86
    img.data[p + 3] = Math.round(Math.pow(t, 1.3) * 135 * fade);
  }
  g.putImageData(img, 0, 0);
  // De y-as van het raster loopt naar het noorden, die van het beeld naar
  // het zuiden: onthouden welke hoek waar hoort.
  return { cv, gx0, gy0, gx1, gy1, cols, rows };
}

export function drawGaps(ctx, MV, W, H) {
  if (!kg.gaps || !kg.bounds) return;
  if (!heat) heat = buildHeat();
  if (!heat) return;
  const nw = MV.project(heat.gx0 * CELL_LON, (heat.gy1 + 1) * CELL_LAT);
  const se = MV.project((heat.gx1 + 1) * CELL_LON, heat.gy0 * CELL_LAT);
  if (se.x < 0 || se.y < 0 || nw.x > W || nw.y > H) return;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(heat.cv, nw.x, nw.y, se.x - nw.x, se.y - nw.y);
  ctx.imageSmoothingEnabled = prev;
}

/* ── Tekenen ────────────────────────────────────────────────────────────
   Alleen wat op het scherm valt — bij 400+ punten scheelt dat merkbaar. */
export function drawKG(ctx, MV, W, H) {
  if (!kg.enabled || !kg.nodes.length) return;

  /* Het hele weefsel tegelijk, als de laag aan staat. Fijne, doorzichtige
     lijnen: het gaat om waar het dicht wordt, niet om welke lijn precies waar
     loopt — daarvoor tik je een punt aan. Documenten die een plek noemen zijn
     blauw, plekken die met elkaar te maken hebben paars; die laatste liggen
     bovenop omdat het er weinig zijn. */
  if (kg.relations && kg.edges.length) {
    ctx.save();
    for (const kind of ["mentions", "related"]) {
      ctx.lineWidth = kind === "related" ? 1.4 : 1;
      ctx.strokeStyle = kind === "related"
        ? "rgba(200,155,245,.50)" : "rgba(122,162,247,.14)";
      ctx.beginPath();
      for (const e of kg.edges) {
        if (e.type !== kind) continue;
        const p = MV.project(e.a.lon, e.a.lat), q = MV.project(e.b.lon, e.b.lat);
        if (Math.max(p.x, q.x) < 0 || Math.max(p.y, q.y) < 0 ||
            Math.min(p.x, q.x) > W || Math.min(p.y, q.y) > H) continue;
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Verbindingen van het aangetikte punt: welke plekken en documenten hebben
  // met elkaar te maken. Alleen bij een selectie, anders is het een web.
  if (kg.selected) {
    const from = MV.project(kg.selected.lon, kg.selected.lat);
    ctx.save();
    ctx.strokeStyle = "rgba(122,162,247,.42)";
    ctx.lineWidth = 1.2;
    for (const id of kg.linksOf.get(kg.selected.id) || []) {
      const other = kg.nodeById.get(id);
      if (!other) continue;                       // geen coördinaat, niets te tekenen
      const to = MV.project(other.lon, other.lat);
      if (Math.max(from.x, to.x) < 0 || Math.max(from.y, to.y) < 0 ||
          Math.min(from.x, to.x) > W || Math.min(from.y, to.y) > H) continue;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(to.x, to.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(122,162,247,.9)"; ctx.fill();
    }
    ctx.restore();
  }

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

export function kgDescribe(n) {
  const bits = [KL[kgLang][n.type] || n.type];
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
  const said = [title, description].filter(Boolean).join(" — ") || (kgLang === "en" ? "(no explanation given)" : "(geen toelichting gegeven)");
  const docs = near.filter((r) => r.node.type === "document")
                   .map((r) => `"${r.node.label}" (${formatDistance(r.dist)})`);
  if (kgLang === "en") {
    return [
      `At a participation table in Breda, the following was said about ${place}: "${said}".`,
      `Theme: ${topic}. Nature of the remark: ${verdictName}.`,
      docs.length ? `Documents in the immediate vicinity: ${docs.join(", ")}.` : "",
      `Question: what do the policy and the documents say about this place and this theme, and what solution or next step follows from that? Answer briefly and in English, and refer to the documents you base yourself on.`,
    ].filter(Boolean).join(" ");
  }
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
export type AskOpties = {
  /* Krijgt de tekst zoals hij tot nu toe is — niet alleen het nieuwe stukje. */
  onToken?: (tekstTotNu: string) => void;
  onSources?: (fragmenten: any[]) => void;
  signal?: AbortSignal;
};
export async function ask(question, { onToken, onSources, signal }: AskOpties = {}) {
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

/* ── Het document zelf ──────────────────────────────────────────────────
   De lijst met titels is pas bruikbaar als je erop kunt tikken. */
export function fileUrl(docId) {
  return kg.client ? kg.client.fileUrl(docId) : "";
}

/* Wat er letterlijk over een plek staat: de tekstfragmenten met hun
   paginanummer, plus de documenten waar ze uit komen. Alleen zinvol voor
   entiteiten — een document verwijst niet naar zichzelf. */
export async function knowledgeOf(entId) {
  if (!kg.client) return null;
  try { return await kg.client.knowledge(entId); }
  catch (e) { console.warn("[kg] knowledge mislukt:", e); return null; }
}

/* Zoeken op wat er gezegd is in plaats van op waar het gezegd is.
   `semantic` laat coco-biblio de zin door de embedder halen en op betekenis
   zoeken — dat vindt het afvalbeleid ook als het in een stuk over de
   binnenstad staat. Draait er geen backend, dan valt de client terug op de
   fixtures en wordt het een gewone zoekopdracht op woorden. */
export async function relevantDocs(text, { limit = 4 } = {}) {
  const q = (text || "").trim();
  if (!kg.client || q.length < 4) return [];
  try {
    const docs = await kg.client.documents({ search: q, semantic: true });
    return docs.slice(0, limit);
  } catch (e) {
    console.warn("[kg] zoeken mislukt:", e);
    return [];
  }
}
