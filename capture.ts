/* ═══════════════════════════════════════════════════════════════
   VASTLEGGEN — het tafelbeeld als foto, opname of tijdlapse
   ═══════════════════════════════════════════════════════════════
   Wat er tijdens een sessie op tafel gebeurt is het eigenlijke resultaat: waar
   de pucks landen, in welke volgorde, hoe het beeld zich vult. De export naar
   GeoJSON en CSV houdt de bijdrage over, maar niet het beeld — en juist dat
   beeld is wat je later aan een opdrachtgever laat zien.

   Drie manieren, één module:

     foto      Eén stilstaand beeld van het canvas, als PNG.
     opname    Een filmpje van het canvas terwijl het gesprek loopt.
     tijdlapse Elke paar seconden een beeld; aan het eind worden die achter
               elkaar tot een kort filmpje gemaakt.

   Waarom het canvas en niet het scherm
   ────────────────────────────────────
   `getDisplayMedia()` zou ook de vensters meenemen, maar opent bij élke start
   een keuzevenster van de browser. Aan een kiosk zonder muis staat daar
   niemand om dat weg te klikken (zie deploy/KIOSK.md) en dan gebeurt er
   simpelweg niets. `canvas.captureStream()` vraagt niets en levert precies
   wat we willen bewaren: de kaart met de markeringen erop. De panelen die
   erboven zweven zitten er dus niet in — dat is hier een keuze, geen gebrek.

   Het canvas mag niet besmet zijn
   ───────────────────────────────
   Een tegelserver zonder CORS-header laat het beeld wél zien maar niet
   uitlezen; het canvas is dan "tainted" en zowel `toBlob` als de recorder
   weigeren. Dat is dezelfde beperking als bij het offline bewaren van de
   kaart — app.ts vertaalt de reden "besmet" naar dezelfde uitleg.

   Grenzen
   ───────
   Een middag met publiek mag niet stilletjes op een vol geheugen stuklopen.
   Zowel de opname als de tijdlapse stopt daarom uit zichzelf zodra hij te
   lang of te groot wordt, en levert dan gewoon af wat er tot dan toe is.
*/

export type CapKind   = "shot" | "rec" | "lapse";
export type CapReason = "stop" | "limiet" | "besmet" | "leeg" | "fout" | "onbruikbaar";

export type CapEvents = {
  /* De stand veranderde: knoptekst, teller of "bezig". */
  change?: () => void;
  /* Er ligt een bestand klaar — of het is mislukt, dan is blob null. */
  done?: (kind: CapKind, blob: Blob | null, reason: CapReason) => void;
};

/* Beeldbreedtes. De tafel is 4K; een foto op ware grootte is prima, maar een
   tijdlapse van honderden beelden op die maat past niet in het geheugen. */
const SHOT_MAX_W  = 3840;
const LAPSE_MAX_W = 1600;
const JPEG_Q      = 0.72;

const LAPSE_EVERY_MS   = 5000;            // hoe vaak er een beeld bij komt
const LAPSE_PLAY_FPS   = 12;              // hoe snel ze daarna langskomen
const LAPSE_MAX_FRAMES = 900;             // ~75 minuten
const LAPSE_MAX_BYTES  = 120 * 1024 * 1024;

const REC_FPS       = 24;
const REC_BITRATE   = 6_000_000;
const REC_MAX_MS    = 30 * 60 * 1000;
const REC_MAX_BYTES = 600 * 1024 * 1024;

/* Chromium op de NUC levert webm/vp9; Safari op een Mac kan alleen mp4. Wie
   niets van de lijst kent kan geen video opnemen — de foto blijft dan over. */
const MIMES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of MIMES) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} }
  return "";
}

let cv: HTMLCanvasElement | null = null;
let ev: CapEvents = {};

let rec: MediaRecorder | null = null;
let recChunks: Blob[] = [];
let recBytes = 0, recStart = 0, recTimer = 0;
let recReason: CapReason = "stop";
let recMime = "";

type Lapse = { timer: number; frames: Blob[]; bytes: number; start: number };
let lapse: Lapse | null = null;
let busy = false;                          // de tijdlapse wordt in elkaar gezet

export function init(canvas: HTMLCanvasElement, events: CapEvents = {}) {
  cv = canvas; ev = events;
}

/* Kan deze browser überhaupt video? De fotoknop werkt altijd. */
export const canFilm = () =>
  typeof MediaRecorder !== "undefined" &&
  typeof (HTMLCanvasElement.prototype as any).captureStream === "function" &&
  !!pickMime();

export const state = () => ({
  rec  : !!rec,
  lapse: !!lapse,
  busy,
  ms    : rec   ? Date.now() - recStart : 0,
  frames: lapse ? lapse.frames.length   : 0
});

export const ext = (blob: Blob | null) =>
  (blob?.type || recMime || "").includes("mp4") ? ".mp4" : ".webm";

/* ── Foto ──────────────────────────────────────────────────────────────── */
export function shot(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!cv) { reject(new Error("geen canvas")); return; }
    const off = scaled(cv, SHOT_MAX_W);
    if (!off) { reject(new Error("leeg")); return; }
    try {
      off.toBlob(b => b ? resolve(b) : reject(new Error("leeg")), "image/png");
    } catch (err) { reject(err); }        // besmet canvas gooit hier
  });
}

function scaled(src: HTMLCanvasElement, maxW: number): HTMLCanvasElement | null {
  if (!src.width || !src.height) return null;
  const f = Math.min(1, maxW / src.width);
  const off = document.createElement("canvas");
  off.width  = Math.max(2, Math.round(src.width  * f));
  off.height = Math.max(2, Math.round(src.height * f));
  off.getContext("2d")!.drawImage(src, 0, 0, off.width, off.height);
  return off;
}

/* ── Opname ────────────────────────────────────────────────────────────── */
export function toggleRec() { rec ? finishRec("stop") : beginRec(); }

function beginRec() {
  if (!cv || rec || busy) return;
  const mime = pickMime();
  let r: MediaRecorder;
  try {
    const stream = (cv as any).captureStream(REC_FPS) as MediaStream;
    r = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: REC_BITRATE } : undefined);
  } catch (err) { ev.done?.("rec", null, "onbruikbaar"); return; }

  recChunks = []; recBytes = 0; recStart = Date.now();
  recReason = "stop"; recMime = r.mimeType || mime || "video/webm";

  r.ondataavailable = e => {
    if (!e.data || !e.data.size) return;
    recChunks.push(e.data); recBytes += e.data.size;
    if (recBytes > REC_MAX_BYTES) finishRec("limiet");
  };
  // Een besmet canvas struikelt hier, niet bij het starten.
  r.onerror = () => { recReason = "besmet"; try { r.stop(); } catch (e) { endRec(); } };
  r.onstop  = endRec;

  try { r.start(1000); }
  catch (err) { ev.done?.("rec", null, "onbruikbaar"); return; }

  rec = r;
  recTimer = setInterval(() => {
    ev.change?.();
    if (Date.now() - recStart > REC_MAX_MS) finishRec("limiet");
  }, 1000) as unknown as number;
  ev.change?.();
}

function finishRec(reason: CapReason) {
  if (!rec) return;
  recReason = reason;
  try { rec.stop(); } catch (err) { endRec(); }
}

function endRec() {
  const r = rec; rec = null;
  clearInterval(recTimer); recTimer = 0;
  stopTracks(r);
  const chunks = recChunks; recChunks = [];
  ev.change?.();
  const blob = chunks.length ? new Blob(chunks, { type: recMime }) : null;
  ev.done?.("rec", blob, blob ? recReason : (recReason === "stop" ? "leeg" : recReason));
}

function stopTracks(r: MediaRecorder | null) {
  try { r?.stream?.getTracks().forEach(t => t.stop()); } catch (e) {}
}

/* ── Tijdlapse ─────────────────────────────────────────────────────────── */
export function toggleLapse() { lapse ? endLapse("stop") : beginLapse(); }

function beginLapse() {
  if (!cv || lapse || busy) return;
  lapse = { timer: 0, frames: [], bytes: 0, start: Date.now() };
  grabFrame();                                       // meteen een beginbeeld
  lapse.timer = setInterval(grabFrame, LAPSE_EVERY_MS) as unknown as number;
  ev.change?.();
}

function grabFrame() {
  if (!lapse || !cv) return;
  const off = scaled(cv, LAPSE_MAX_W);
  if (!off) return;
  try {
    off.toBlob(b => {
      if (!lapse || !b) return;
      lapse.frames.push(b); lapse.bytes += b.size;
      ev.change?.();
      if (lapse.frames.length >= LAPSE_MAX_FRAMES || lapse.bytes >= LAPSE_MAX_BYTES)
        endLapse("limiet");
    }, "image/jpeg", JPEG_Q);
  } catch (err) { endLapse("besmet"); }   // besmet canvas
}

async function endLapse(reason: CapReason) {
  if (!lapse) return;
  clearInterval(lapse.timer);
  const frames = lapse.frames;
  lapse = null;

  if (reason === "besmet" || frames.length < 2) {
    ev.change?.();
    ev.done?.("lapse", null, reason === "besmet" ? "besmet" : "leeg");
    return;
  }
  busy = true; ev.change?.();
  let blob: Blob | null = null, why: CapReason = reason;
  try { blob = await renderLapse(frames); }
  catch (err) { why = "fout"; }
  busy = false; ev.change?.();
  ev.done?.("lapse", blob, blob ? why : "fout");
}

/* De bewaarde beelden achter elkaar op een eigen canvas zetten en dát opnemen.
   Ze worden pas hier uitgepakt: honderden losse beelden tegelijk in het
   geheugen houden is precies wat we op de NUC niet moeten doen. */
async function renderLapse(frames: Blob[]): Promise<Blob> {
  const first = await createImageBitmap(frames[0]);
  const out = document.createElement("canvas");
  out.width = first.width; out.height = first.height;
  const g = out.getContext("2d")!;
  g.drawImage(first, 0, 0);
  first.close?.();

  const mime = pickMime();
  const stream = (out as any).captureStream(LAPSE_PLAY_FPS) as MediaStream;
  const track  = stream.getVideoTracks()[0] as any;
  const r = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: REC_BITRATE } : undefined);
  const chunks: Blob[] = [];
  r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>(res => { r.onstop = () => res(); });
  r.start();

  const step = Math.round(1000 / LAPSE_PLAY_FPS);
  for (const f of frames) {
    const bmp = await createImageBitmap(f);
    g.drawImage(bmp, 0, 0, out.width, out.height);
    bmp.close?.();
    track?.requestFrame?.();
    await wait(step);
  }
  await wait(step * 4);                    // het laatste beeld even laten staan
  try { r.stop(); } catch (e) {}
  track?.stop?.();
  await stopped;
  recMime = r.mimeType || mime || "video/webm";
  return new Blob(chunks, { type: recMime });
}

const wait = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

/* Bij het wissen van een sessie of een reset hoort niets door te lopen. */
export function cancelAll() {
  if (rec) finishRec("stop");
  if (lapse) { clearInterval(lapse.timer); lapse = null; ev.change?.(); }
}
