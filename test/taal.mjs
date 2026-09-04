/* Gaat de taal die iemand bij de opnameknop kiest ook echt mee naar de
 * uitschrijfdienst?
 *
 *   npm run taal
 *
 * De rooktest (test/smoke.mjs) komt hier niet aan toe: die draait zonder
 * dienst en zonder microfoon, en ziet dus alleen dát de kiezer er staat. Deze
 * test zet een nep-dienst neer -- een GET met 200, waarmee de tafel de stand
 * "backend" kiest -- en start chromium met een nepmicrofoon. Daarna leest hij
 * het `lang`-veld uit de blokjes die binnenkomen. Dat is het enige wat telt:
 * whisper krijgt zijn taal per blokje mee, niet één keer bij het starten.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* De tafel is TypeScript; een browser leest alleen JavaScript. Daarom zet
 * `tsc` de bronbestanden eerst om naar de werkmap. Dat is met opzet niet de
 * echte build: `vite build` heeft binaries nodig die niet overal draaien,
 * terwijl `tsc` zelf JavaScript is en dus altijd werkt. Wat de browser hier
 * te zien krijgt is dezelfde code, alleen zonder de types. */
function bouwNaar(work) {
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  const r = spawnSync(process.execPath,
    [tsc, "-p", path.join(root, "tsconfig.json"),
     "--noEmit", "false", "--outDir", work, "--rootDir", root],
    { encoding: "utf8" });
  if (r.status !== 0) {
    console.error("tsc kreeg de tafel niet omgezet:\n" + (r.stdout || "") + (r.stderr || ""));
    process.exit(2);
  }
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "pucktable-taal-"));
for (const naam of ["index.html", "styles.css"])
  fs.copyFileSync(path.join(root, naam), path.join(work, naam));
bouwNaar(work);
fs.cpSync(path.join(root, "public"), path.join(work, "public"), { recursive: true });
fs.cpSync(path.join(root, "public", "fixtures"), path.join(work, "fixtures"), { recursive: true });
fs.writeFileSync(path.join(work, "biblio-stub.js"),
  `export function defaultClient(){return{graph:async()=>({nodes:[],links:[]}),documents:async()=>[],chat:async function*(){}};}\nexport default {defaultClient};\n`);
{
  const p = fs.readFileSync(path.join(work, "index.html"), "utf8");
  // Wat in index.html staat, en waar het in de werkmap door vervangen wordt.
  const tag = '<script type="module" src="./app.ts"></script>';
  const tagJs = '<script type="module" src="./app.js"></script>';
  if (!p.includes(tag)) { console.error("index.html laadt app.ts niet zoals verwacht"); process.exit(2); }
  fs.writeFileSync(path.join(work, "index.html"), p.replace(tag,
    '<script type="importmap">{"imports":{"@biblio":"./biblio-stub.js"}}</script>\n' + tagJs));
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
                ".json": "application/json", ".txt": "text/plain", ".png": "image/png" };
const talen = [];                                  // wat de dienst binnenkreeg
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
  if (rel === "api/transcribe") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, model: "nep", klaar: true }));
      return;
    }
    const brokken = [];
    req.on("data", d => brokken.push(d));
    req.on("end", () => {
      // latin1: de body is deels binair, en we zoeken alleen een tekstveld.
      const body = Buffer.concat(brokken).toString("latin1");
      const m = body.match(/name="lang"\r\n\r\n([^\r]*)\r\n/);
      talen.push(m ? m[1] : "(geen)");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ text: "nep" }));
    });
    return;
  }
  const file = path.join(work, rel || "index.html");
  if (!file.startsWith(work) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("nee"); return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = "http://127.0.0.1:" + server.address().port;

let fout = 0;
const ok = (naam, goed) => { console.log((goed ? "✓ " : "✗ ") + naam); if (!goed) fout = 1; };

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM,
  // Zoals de kiosk: geen toestemmingsbalk, en een microfoon die er niet is.
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, permissions: ["microphone"] });
await ctx.addInitScript(() => { try { localStorage.clear(); localStorage.setItem("pucktable-ui-mode", "laptop"); } catch (e) {} });
const page = await ctx.newPage();
page.on("pageerror", e => { console.log("pageerror:", String(e)); fout = 1; });
await page.route("**tile.openstreetmap.org/**", r => r.abort());
await page.goto(BASE + "/index.html?test");
await page.waitForTimeout(1200);

// Een markering maken: puck uit de lade slepen, kijkgat aantikken, thema tikken.
const tray = page.locator("#puckDock .traypuck").first();
const b = await tray.boundingBox();
const cx = 800, cy = 500;
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.mouse.down();
await page.mouse.move(cx, cy, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(400);
await page.mouse.click(cx, cy);
await page.waitForTimeout(250);
const thema = await page.evaluate(o => {
  const P = window.__puck, n = P.topics().length + 1;
  const a = P.ringStart(n) + (o.i + 0.5) * Math.PI * 2 / n, r = P.ringPX();
  return { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r };
}, { x: cx, y: cy, i: 0 });
await page.mouse.click(thema.x, thema.y);
await page.waitForTimeout(600);

const zicht = await page.evaluate(() => {
  const box = document.getElementById("talkLang");
  const auto = document.getElementById("talkLangAuto");
  return {
    venster: getComputedStyle(document.getElementById("note")).display,
    box: box ? box.style.display : "(weg)",
    auto: auto ? auto.style.display : "(weg)",
    aan: [...(box ? box.querySelectorAll("button") : [])]
      .filter(x => x.getAttribute("aria-pressed") === "true").map(x => x.id),
  };
});
ok("het venster staat open", zicht.venster === "block" || (console.log(zicht), false));
ok("de kiezer staat er met een dienst erachter", zicht.box !== "none");
ok("Auto verschijnt alleen bij de eigen dienst -- en die is er", zicht.auto !== "none");
ok("standaard staat de taal van de tafel aan", zicht.aan.length === 1 && zicht.aan[0] === "talkLangNl");

// EN kiezen en opnemen: elk blokje hoort lang=en mee te krijgen.
await page.click("#talkLangEn");
await page.waitForTimeout(100);
ok("EN staat aan na de klik", (await page.getAttribute("#talkLangEn", "aria-pressed")) === "true");
await page.click("#talkBtn");
await page.waitForTimeout(600);
ok("tijdens de opname ligt de taal vast", await page.locator("#talkLangNl").isDisabled());
await page.waitForTimeout(9500);                   // één blokje van 8 s afwachten
await page.click("#talkBtn");
await page.waitForTimeout(1500);
ok("de opname stuurde lang=en mee",
   (talen.length > 0 && talen.every(t => t === "en")) || (console.log("talen:", talen), false));
ok("na afloop mag de taal weer om", !(await page.locator("#talkLangNl").isDisabled()));

// En Auto stuurt "auto", waarop de dienst whisper zelf laat kiezen.
talen.length = 0;
await page.click("#talkLangAuto");
await page.click("#talkBtn");
await page.waitForTimeout(9500);
await page.click("#talkBtn");
await page.waitForTimeout(1500);
ok("de opname stuurde lang=auto mee",
   (talen.length > 0 && talen.every(t => t === "auto")) || (console.log("talen:", talen), false));

await browser.close();
server.close();
console.log(fout ? "\ner ging iets mis" : "\nalles goed");
process.exit(fout);
