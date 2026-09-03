/* ═══════════════════════════════════════════════════════════════
   SPRAAK — het gesprek aan tafel uitschrijven
   ═══════════════════════════════════════════════════════════════
   Aan deze tafel wordt vooral gepraat. Wat er in het venster getypt wordt is
   de samenvatting van degene die toevallig de pen vasthoudt; het gesprek zelf
   verdwijnt zodra de groep doorloopt. Deze module schrijft dat gesprek uit
   terwijl het gevoerd wordt.

   Dit is de enige plek die weet hóé spraak tekst wordt. app.js vraagt alleen
   "begin" en "stop" en krijgt stukjes tekst terug. Er zijn twee bronnen die
   hetzelfde werk doen, en deze module kiest zelf:

     backend   Een uitschrijfdienst (whisper) naast coco-biblio: de tafel
               stuurt blokjes audio naar POST api/transcribe en krijgt tekst
               terug. Niets verlaat de tafel — dit is de bron die we op de NUC
               willen, en de enige die je aan publiek kunt uitleggen.
     browser   De spraakherkenning van de browser zelf (Web Speech API).
               Werkt zonder iets te installeren, maar Chrome stuurt de audio
               naar Google, en een Chromium zonder sleutels doet stilletjes
               niets. Terugval, geen bestemming.

   Kan geen van beide, dan blijft opnemen over: het gesprek wordt bewaard als
   geluidsbestand dat je kunt downloaden en later zelf uitschrijft. Beter een
   opname zonder tekst dan een middag die nergens meer staat.

   Twee dingen die je op de tafel tegenkomt:
   · De microfoon en de spraakherkenning bestaan alleen in een "secure
     context". http://localhost telt daarvoor mee — de kiosk opent de tafel zo
     — maar http://<ip>:8080 vanaf een andere laptop niet. Daar is
     `navigator.mediaDevices` er domweg niet, en dat is geen storing die je
     kunt wegprogrammeren.
   · De microfoonvraag komt één keer per browserprofiel. In de kiosk staat
     niemand met een muis om hem weg te klikken, dus start chromium daar met
     --use-fake-ui-for-media-stream (zie deploy/kiosk.sh).
*/

/* Hoe lang een blokje audio duurt voordat het naar de uitschrijfdienst gaat.
   Korter betekent sneller tekst op tafel maar meer verzoeken, en whisper
   heeft een aanloop nodig om een zin te herkennen: onder de vijf seconden
   gaat het einde van elke zin verloren. Acht seconden is de afweging. */
const CHUNK_MS = 8000;

/* Een blokje dat kleiner is dan dit is stilte met een beetje ruis; dat hoeft
   de uitschrijver niet te zien. */
const MIN_BYTES = 1600;

export const stt = {
  mode: "onbekend",   // "backend" | "browser" | "audio" | "geen"
  reason: "",         // waarom er niets kan: "insecure" | "nomic"
  url: "",            // adres van de uitschrijfdienst, als die er is
  checked: false,
};

const Recognition = () =>
  (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;
const hasMic = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const hasRecorder = () => typeof MediaRecorder !== "undefined";

/* De standaardpoort van de uitschrijver. De tafel wordt op de NUC geserveerd
   door `python3 -m http.server`, en die kan niets doorsturen: de dienst draait
   dus naast de tafel op zijn eigen poort in plaats van op /api van dezelfde
   server. Vandaar dat we hem hier zoeken in plaats van er een instelling van
   te maken die iemand op de dag zelf moet weten. */
const STT_PORT = 8770;

/* De uitschrijfdienst hangt aan hetzelfde adres als de kennisgraaf: leeg
   betekent "op deze server", zodat de tafel achter een subpad ook werkt. */
function transcribeUrl(baseUrl) {
  const b = (baseUrl || "").trim().replace(/\/+$/, "");
  return (b ? b + "/" : "") + "api/transcribe";
}

/* Waar we gaan kijken. Is er een adres opgegeven, dan precies daar en nergens
   anders — wie het instelt bedoelt het. Is er niets opgegeven, dan eerst deze
   server zelf (zo werkt de vite-dev-server, die /api/transcribe doorstuurt) en
   daarna dezelfde machine op de standaardpoort. Dat tweede adres is wat de
   tafel op de NUC vindt. */
function transcribeKandidaten(baseUrl) {
  const eigen = transcribeUrl(baseUrl);
  if ((baseUrl || "").trim()) return [eigen];
  const lijst = [eigen];
  try {
    const l = location;
    if (l.hostname && l.protocol.startsWith("http") && l.port !== String(STT_PORT))
      lijst.push(`${l.protocol}//${l.hostname}:${STT_PORT}/api/transcribe`);
  } catch (e) { /* geen location: dan blijft het bij de eigen oorsprong */ }
  return lijst;
}

/* Wat kan deze tafel? Eén keer polsen per adres; het antwoord verandert niet
   halverwege een middag. De dienst hoort op een GET een 200 te geven — draait
   hij niet, dan is dat een 404 van de biblio-backend of een netwerkfout, en
   valt de tafel terug op wat de browser zelf kan. */
let probing = null, probedFor = null;
export function probeSTT(baseUrl = "") {
  if (stt.checked && probedFor === baseUrl) return Promise.resolve(stt);
  if (probing && probedFor === baseUrl) return probing;
  probedFor = baseUrl;
  probing = (async () => {
    stt.checked = false; stt.mode = "onbekend"; stt.reason = ""; stt.url = "";
    if (hasMic() && hasRecorder()) {
      for (const url of transcribeKandidaten(baseUrl)) {
        try {
          const r = await fetch(url, { method: "GET", cache: "no-store" });
          if (r.ok) { stt.mode = "backend"; stt.url = url; break; }
        } catch (e) { /* deze niet; de volgende, anders de terugval hieronder */ }
      }
    }
    if (stt.mode !== "backend") {
      if (Recognition()) stt.mode = "browser";
      else if (hasMic() && hasRecorder()) stt.mode = "audio";
      else {
        stt.mode = "geen";
        stt.reason = (typeof isSecureContext !== "undefined" && !isSecureContext) ? "insecure" : "nomic";
      }
    }
    stt.checked = true;
    return stt;
  })().finally(() => { probing = null; });
  return probing;
}

export const sttWorks = () => stt.mode === "backend" || stt.mode === "browser";

/* ── Opnemen ─────────────────────────────────────────────────────────────
   `startTalk` levert een sessie met één knop: stop(). Wat er onderweg
   gebeurt gaat via de meldingen:

     lang              "nl" | "en" | "auto" — "auto" alleen naar de eigen
                       dienst, die kan een blokje zonder taal aannemen
     onSegment(tekst)  een afgeronde brok spraak — dit hoort bewaard te worden
     onPartial(tekst)  wat er nú gezegd wordt, nog niet zeker; alleen tonen
     onError(sleutel)  "denied" | "nomic" | "backend" | "browser"
     onAudio(blob)     alleen in de opnamestand: het geluid, om te bewaren

   Bewust segmenten en geen volledige tekst: de markering blijft de bron van
   waarheid, zodat iemand die halverwege een zin verbetert dat niet bij de
   volgende brok kwijtraakt. */
export async function startTalk({ lang = "nl", onSegment, onPartial, onError, onAudio } = {}) {
  const say = {
    segment: onSegment || (() => {}),
    partial: onPartial || (() => {}),
    error: onError || (() => {}),
    audio: onAudio || (() => {}),
  };
  if (stt.mode === "browser") return browserSession(lang, say);
  if (stt.mode === "backend" || stt.mode === "audio") return recorderSession(lang, say, stt.mode === "backend");
  say.error(stt.reason || "nomic");
  return null;
}

/* De browser luistert zelf. Chrome stopt de herkenning uit zichzelf zodra het
   even stil is — aan een participatietafel is dat elke halve minuut — dus
   starten we hem in `onend` opnieuw. Gaat dat herstarten tien keer achter
   elkaar mis binnen een fractie van een seconde, dan is er iets structureel
   mis (Chromium zonder sleutels doet precies dat) en stoppen we ermee in
   plaats van in een lus te blijven hangen. */
function browserSession(lang, say) {
  const R = Recognition();
  const rec = new R();
  /* De Web Speech API wil een taal vooraf; "auto" kent ze niet. app.js biedt
     die keuze hier dan ook niet aan, en mocht hij toch binnenkomen dan is de
     tafeltaal beter dan een gok. */
  rec.lang = lang === "en" ? "en-US" : "nl-NL";
  rec.continuous = true;
  rec.interimResults = true;
  let live = true, quickRestarts = 0, lastStart = 0, spoke = false;

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) { const t = (r[0]?.transcript || "").trim(); if (t) { spoke = true; say.segment(t); } }
      else interim += r[0]?.transcript || "";
    }
    say.partial(interim.trim());
  };
  rec.onerror = (e) => {
    if (e.error === "no-speech" || e.error === "aborted") return;
    live = false;
    say.error(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : "browser");
  };
  rec.onend = () => {
    if (!live) return;
    const now = Date.now();
    if (now - lastStart < 400) {
      /* Meteen weer stil: zolang er al iets herkend is, is dat gewoon een
         pauze in het gesprek; is er nog nooit iets gekomen, dan luistert deze
         browser helemaal niet. */
      if (++quickRestarts > (spoke ? 20 : 4)) { live = false; say.error("browser"); return; }
    } else quickRestarts = 0;
    lastStart = now;
    try { rec.start(); } catch (e) { live = false; say.error("browser"); }
  };

  lastStart = Date.now();
  try { rec.start(); } catch (e) { say.error("browser"); return null; }
  return {
    mode: "browser",
    stop() { live = false; say.partial(""); try { rec.stop(); } catch (e) {} },
  };
}

/* Opnemen en versturen. Eén MediaRecorder per blokje in plaats van één lange
   met `timeslice`: een fragment uit het midden van een webm-stroom is op
   zichzelf niet af te spelen en dus ook niet uit te schrijven. Elke ronde is
   daarom een compleet bestandje. */
async function recorderSession(lang, say, toBackend) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (e) {
    say.error(e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "nomic");
    return null;
  }
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || "";

  let live = true, rec = null, timer = null, chunks = [];
  const kept = [];                  // alleen in de opnamestand: alles bewaren
  let queue = Promise.resolve();    // op volgorde uitschrijven
  let toldBackendBroke = false;
  /* Het laatste blokje wordt pas verstuurd als de recorder is uitgegaan, dus
     ná de druk op stop. Wie wil weten wat er uiteindelijk staat, moet op dit
     sein wachten en dan pas op de wachtrij — niet andersom. */
  let recorderDone; const stopped = new Promise(r => { recorderDone = r; });

  const send = (blob) => {
    if (blob.size < MIN_BYTES) return;
    queue = queue.then(async () => {
      const fd = new FormData();
      fd.append("audio", blob, "deel." + (blob.type.includes("mp4") ? "m4a" : "webm"));
      fd.append("lang", lang);
      try {
        const r = await fetch(stt.url, { method: "POST", body: fd });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        const text = String(j.text || "").trim();
        if (text) say.segment(text);
      } catch (e) {
        /* Eén melding, niet één per blokje: valt de dienst weg, dan blijft de
           opname doorlopen en kan wie erbij staat besluiten te stoppen. */
        if (!toldBackendBroke) { toldBackendBroke = true; say.error("backend"); }
      }
    });
  };

  const startPiece = () => {
    chunks = [];
    try { rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); }
    catch (e) { live = false; say.error("nomic"); closeMic(); return; }
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
      if (toBackend) send(blob); else kept.push(blob);
      if (live) startPiece();
      else finish();
    };
    rec.start();
    /* Alleen de uitschrijfstand knipt; zonder dienst is één lange opname
       precies wat je wilt bewaren. */
    if (toBackend) timer = setTimeout(() => { if (rec && rec.state === "recording") rec.stop(); }, CHUNK_MS);
  };

  const closeMic = () => { stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); };

  const finish = () => {
    closeMic();
    if (!toBackend && kept.length) say.audio(new Blob(kept, { type: kept[0].type || "audio/webm" }));
    recorderDone();
  };

  startPiece();
  return {
    mode: toBackend ? "backend" : "audio",
    stop() {
      live = false;
      clearTimeout(timer); timer = null;
      say.partial("");
      if (rec && rec.state === "recording") rec.stop();   // onstop rondt af
      else finish();
      // Eerst de recorder laten uitlopen, dan pas de wachtrij: het laatste
      // stukje spraak wordt pas ná die stop op reis gestuurd.
      return stopped.then(() => queue);
    },
  };
}
