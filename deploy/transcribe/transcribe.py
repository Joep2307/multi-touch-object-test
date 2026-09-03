#!/usr/bin/env python3
"""De uitschrijver van de participatietafel.

Neemt blokjes audio aan van de tafel en geeft er tekst voor terug. Draait op de
NUC zelf, naast de statische server: het gesprek van bezoekers verlaat de tafel
niet. Dat is geen luxe maar de voorwaarde waaronder je aan een tafel met publiek
een microfoon mag aanzetten.

Twee routes, precies wat speech.js verwacht (zie deploy/TRANSCRIPTIE.md):

    GET  /api/transcribe   ->  200 {"ok":true,"model":"small","klaar":true}
    POST /api/transcribe   ->  200 {"text":"..."}
         multipart/form-data met  audio = een compleet audiobestandje (~8 s)
                                  lang  = "nl", "en" of "auto"

Alles wat geen 200 is op de GET betekent voor de tafel "geen dienst" — dan valt
hij terug op de spraakherkenning van de browser of op alleen opnemen. De GET
antwoordt daarom meteen, ook als het model nog aan het laden is; `klaar` zegt of
er al uitgeschreven kan worden.

Draaien:

    PUCK_STT_MODEL=small python3 transcribe.py

Instellingen komen uit de omgeving, want systemd geeft ze zo door:

    PUCK_STT_PORT     8770        poort waar de tafel hem zoekt
    PUCK_STT_MODEL    small       tiny · base · small · medium · large-v3
    PUCK_STT_DEVICE   cpu         cuda als de machine een GPU heeft
    PUCK_STT_COMPUTE  int8        int8_float16 / float16 op een GPU
    PUCK_STT_LANG     nl          taal als de tafel er geen meestuurt ("auto"
                                  laat whisper hem per blokje zelf bepalen)
    PUCK_STT_BIND     127.0.0.1   0.0.0.0 om hem van buiten de NUC te bereiken
    PUCK_STT_MODEL_DIR            eigen map met modellen (offline machine)
"""

import io
import json
import os
import re
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

POORT = int(os.environ.get("PUCK_STT_PORT", "8770"))
BIND = os.environ.get("PUCK_STT_BIND", "127.0.0.1")
MODEL = os.environ.get("PUCK_STT_MODEL", "small")
DEVICE = os.environ.get("PUCK_STT_DEVICE", "cpu")
COMPUTE = os.environ.get("PUCK_STT_COMPUTE", "int8")
TAAL = os.environ.get("PUCK_STT_LANG", "nl")
MODEL_DIR = os.environ.get("PUCK_STT_MODEL_DIR") or None

# Groter dan dit is geen blokje van acht seconden meer maar iemand die de dienst
# als algemene uploadplek gebruikt.
MAX_BYTES = 25 * 1024 * 1024


def log(*a):
    print(time.strftime("[%H:%M:%S]"), *a, flush=True)


# ── Wat whisper verzint als niemand praat ───────────────────────────────────
# Op stilte of ruis vult het model de leegte met wat het in ondertitelbestanden
# geleerd heeft. Aan een tafel met publiek is dat geen grap: dan staat er
# "Ondertiteling door de Amara.org gemeenschap" in de opbrengst van een
# participatiemiddag. De VAD-filter houdt het meeste tegen, deze lijst de rest.
ONZIN = [
    r"ondertitel",
    r"amara\.org",
    r"bedankt voor het kijken",
    r"abonneer",
    r"tot de volgende keer",
    r"subtitles? by",
    r"thanks? for watching",
    r"^\W*$",
]
ONZIN_RE = [re.compile(p, re.I) for p in ONZIN]


def is_onzin(zin: str) -> bool:
    kaal = zin.strip()
    if len(kaal) < 2:
        return True
    return any(r.search(kaal) for r in ONZIN_RE)


class Uitschrijver:
    """Het model, één keer geladen en achter een slot.

    Het slot is er omdat de tafel blokjes op volgorde stuurt maar een tweede
    tafel (of een tweede venster) dat niet weet; twee transcripties tegelijk op
    één CPU maken ze allebei traag in plaats van één snel.
    """

    def __init__(self):
        self._model = None
        self._slot = threading.Lock()
        self._laadslot = threading.Lock()
        self.fout = ""

    @property
    def klaar(self) -> bool:
        return self._model is not None

    def laad(self):
        if self._model is not None:
            return self._model
        with self._laadslot:
            if self._model is not None:
                return self._model
            from faster_whisper import WhisperModel

            log(f"model {MODEL} laden ({DEVICE}, {COMPUTE})…")
            begin = time.time()
            self._model = WhisperModel(
                MODEL, device=DEVICE, compute_type=COMPUTE, download_root=MODEL_DIR
            )
            log(f"model klaar in {time.time() - begin:.1f}s")
            return self._model

    def tekst(self, pad: str, taal: str = "") -> str:
        model = self.laad()
        with self._slot:
            # Lege taal = laten bepalen. Whisper doet dat per blokje opnieuw,
            # dus acht seconden "eh, ja" kan zomaar Duits worden; met een vaste
            # taal kan dat niet. Alleen aanzetten waar het echt gemengd is.
            segmenten, info = model.transcribe(
                pad,
                language=taal or None,
                beam_size=1,                    # snelheid boven de laatste procenten
                vad_filter=True,                # stilte eruit voor het model kijkt
                vad_parameters={"min_silence_duration_ms": 400},
                # Elk blokje staat op zichzelf; meegeven wat er hiervóór stond
                # laat het model bij twijfel de vorige zin herhalen.
                condition_on_previous_text=False,
            )
            if not taal:
                log(f"taal herkend: {info.language} ({info.language_probability:.2f})")
            zinnen = []
            for s in segmenten:
                # Twee maten voor "dit was geen spraak": het model zegt zelf hoe
                # zeker het is dat er stilte was, en hoe waarschijnlijk de tekst
                # was die het eruit haalde.
                if getattr(s, "no_speech_prob", 0) > 0.6:
                    continue
                if getattr(s, "avg_logprob", 0) < -1.0:
                    continue
                if is_onzin(s.text):
                    continue
                zinnen.append(s.text.strip())
        return " ".join(zinnen).strip()


# ── multipart uitpakken ─────────────────────────────────────────────────────
# Geen cgi-module: die is uit Python 3.13 gehaald. De tafel stuurt een keurig
# eenvoudige body, dus dit hoeft alleen dát te kunnen — niet alles wat de RFC
# toestaat.
def uit_multipart(body: bytes, content_type: str):
    m = re.search(r'boundary="?([^";]+)"?', content_type or "", re.I)
    if not m:
        return {}, None, None
    grens = b"--" + m.group(1).encode()
    velden, naam_audio, audio = {}, None, None
    for deel in body.split(grens):
        deel = deel.strip(b"\r\n")
        if not deel or deel == b"--":
            continue
        kop, _, inhoud = deel.partition(b"\r\n\r\n")
        koptekst = kop.decode("utf-8", "replace")
        naam = re.search(r'name="([^"]*)"', koptekst)
        if not naam:
            continue
        bestand = re.search(r'filename="([^"]*)"', koptekst)
        if bestand:
            naam_audio = bestand.group(1)
            audio = inhoud
        else:
            velden[naam.group(1)] = inhoud.decode("utf-8", "replace").strip()
    return velden, naam_audio, audio


def achtervoegsel(naam: str, ct: str) -> str:
    naam = (naam or "").lower()
    for e in (".webm", ".ogg", ".oga", ".m4a", ".mp4", ".wav", ".mp3", ".flac"):
        if naam.endswith(e):
            return e
    ct = (ct or "").lower()
    if "mp4" in ct or "m4a" in ct:
        return ".m4a"
    if "ogg" in ct:
        return ".ogg"
    if "wav" in ct:
        return ".wav"
    return ".webm"


class Handler(BaseHTTPRequestHandler):
    server_version = "puck-stt"
    uitschrijver = None          # wordt in main() gezet; een test zet er een eigen in

    # De eigen logregel is leesbaarder in journalctl dan die van de basisklasse.
    def log_message(self, *a):
        pass

    def _kop(self, code=200, ct="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ct)
        # De pagina draait op poort 8080 en deze dienst op 8770: zonder deze
        # regel weigert de browser het antwoord van zijn eigen tafel.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def _json(self, data, code=200):
        self._kop(code)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _route(self):
        return self.path.split("?")[0].rstrip("/") or "/"

    def do_OPTIONS(self):
        self._kop(204, "text/plain")

    def do_GET(self):
        if self._route() in ("/api/transcribe", "/transcribe", "/"):
            # Meteen antwoorden, ook als het model nog laadt: de tafel wil
            # weten of deze dienst bestáát, niet of hij op dit moment vrij is.
            self._json({
                "ok": True,
                "model": MODEL,
                "device": DEVICE,
                "klaar": self.uitschrijver.klaar,
            })
        else:
            self._json({"error": "onbekende route"}, 404)

    def do_POST(self):
        if self._route() not in ("/api/transcribe", "/transcribe"):
            self._json({"error": "onbekende route"}, 404)
            return
        lengte = int(self.headers.get("Content-Length") or 0)
        if lengte <= 0:
            self._json({"text": ""})
            return
        if lengte > MAX_BYTES:
            self._json({"error": "te groot"}, 413)
            return
        body = self.rfile.read(lengte)
        velden, naam, audio = uit_multipart(body, self.headers.get("Content-Type", ""))
        if not audio:
            self._json({"error": "geen audio in het verzoek"}, 400)
            return
        taal = (velden.get("lang") or TAAL)[:5] or TAAL
        if taal == "auto":
            taal = ""                          # geen taal = whisper zoekt hem zelf
        suffix = achtervoegsel(naam, self.headers.get("Content-Type", ""))
        begin = time.time()
        pad = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
                f.write(audio)
                pad = f.name
            tekst = self.uitschrijver.tekst(pad, taal)
            duur = time.time() - begin
            log(f"{len(audio)//1024} kB {suffix} · {duur:.1f}s · {taal or 'auto'} · {tekst[:60]!r}")
            self._json({"text": tekst, "seconden": round(duur, 2)})
        except Exception as e:
            # Een blokje dat misgaat mag het gesprek niet stilleggen: de tafel
            # meldt het één keer en neemt door. Dus loggen en netjes leeg terug.
            log("mislukt:", repr(e))
            self._json({"error": str(e), "text": ""}, 500)
        finally:
            if pad:
                try:
                    os.unlink(pad)
                except OSError:
                    pass


def main():
    Handler.uitschrijver = Uitschrijver()
    if os.environ.get("PUCK_STT_WARMUP", "1") != "0":
        # Vast laden in de achtergrond: anders wacht het eerste blokje van het
        # eerste gesprek op een model van een halve gigabyte.
        threading.Thread(target=Handler.uitschrijver.laad, daemon=True).start()
    server = ThreadingHTTPServer((BIND, POORT), Handler)
    log(f"uitschrijver luistert op http://{BIND}:{POORT}/api/transcribe")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("gestopt")


if __name__ == "__main__":
    main()
