"""Contracttest: doet de dienst wat speech.js verwacht?
Het model zelf zit hier niet in — dat is een aparte, trage zorg."""
import io, json, math, struct, threading, time, urllib.request, sys, wave
from http.server import ThreadingHTTPServer
import transcribe as T

def proef_audio():
    """Een seconde toon als wav. Bewust met de stdlib en niet met ffmpeg: deze
    test moet overal kunnen draaien, ook op een machine waar alleen python
    staat. Wat erin zit maakt niet uit — de neppe uitschrijver luistert niet."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
        w.writeframes(b"".join(
            struct.pack("<h", int(12000 * math.sin(i * 2 * math.pi * 440 / 16000)))
            for i in range(16000)))
    return buf.getvalue()

class NepUitschrijver:
    klaar = True
    def __init__(self): self.aanroepen = []
    def tekst(self, pad, taal):
        with open(pad,"rb") as f: data=f.read()
        self.aanroepen.append((len(data), taal, pad.rsplit(".",1)[-1]))
        return f"gehoord: {len(data)} bytes in het {taal}"

nep = NepUitschrijver()
T.Handler.uitschrijver = nep
srv = ThreadingHTTPServer(("127.0.0.1", 0), T.Handler)
poort = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{poort}"
goed = True
def ok(naam, waar):
    global goed
    print(("✓ " if waar else "✗ ")+naam)
    if not waar: goed=False

# 1. polsslag
r = urllib.request.urlopen(BASE+"/api/transcribe")
j = json.loads(r.read())
ok("GET geeft 200 met ok:true", r.status==200 and j.get("ok") is True)
ok("GET noemt het model", "model" in j)
ok("CORS-kop staat erop", r.headers.get("Access-Control-Allow-Origin")=="*")

# 2. een blokje opsturen, net als de tafel
audio = proef_audio()
grens = "----pucktest"
body = b""
body += f"--{grens}\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"deel.webm\"\r\nContent-Type: audio/webm\r\n\r\n".encode()
body += audio + b"\r\n"
body += f"--{grens}\r\nContent-Disposition: form-data; name=\"lang\"\r\n\r\nnl\r\n".encode()
body += f"--{grens}--\r\n".encode()
req = urllib.request.Request(BASE+"/api/transcribe", data=body,
      headers={"Content-Type": f"multipart/form-data; boundary={grens}"})
r = urllib.request.urlopen(req)
j = json.loads(r.read())
ok("POST geeft tekst terug", j.get("text","").startswith("gehoord:"))
ok("de audio komt heel aan", nep.aanroepen[0][0]==len(audio) or (print(nep.aanroepen),False))
ok("de taal komt mee", nep.aanroepen[0][1]=="nl")
ok("de extensie blijft webm", nep.aanroepen[0][2]=="webm")

# 3. leeg verzoek
req = urllib.request.Request(BASE+"/api/transcribe", data=b"", headers={"Content-Type":"multipart/form-data; boundary=x"})
try:
    r = urllib.request.urlopen(req); j=json.loads(r.read()); ok("leeg verzoek geeft lege tekst", j.get("text")=="")
except Exception as e: ok("leeg verzoek geeft lege tekst", False)

# 4. een kapot model legt het gesprek niet stil
class Stuk:
    klaar = True
    def tekst(self, pad, taal): raise RuntimeError("model weg")
T.Handler.uitschrijver = Stuk()
req = urllib.request.Request(BASE+"/api/transcribe", data=body, headers={"Content-Type": f"multipart/form-data; boundary={grens}"})
try:
    urllib.request.urlopen(req); ok("een fout geeft geen 200", False)
except urllib.error.HTTPError as e:
    j=json.loads(e.read()); ok("een fout geeft 500 met uitleg", e.code==500 and "model weg" in j.get("error",""))

# 5. onzinfilter
ok("ondertitelruis wordt eruit gegooid", T.is_onzin("Ondertiteling door de Amara.org gemeenschap"))
ok("echte zin blijft staan", not T.is_onzin("De oversteek bij de singel is 's avonds donker."))
print("\n" + ("alles goed" if goed else "er ging iets mis"))
sys.exit(0 if goed else 1)
