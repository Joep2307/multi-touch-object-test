/* Smoke test for the participation table.
 *
 *   npm run smoke
 *
 * Why a custom harness and not vitest: this test doesn't need to understand
 * the app, it needs to use it. It builds the app with vite into a temporary
 * directory — with `@biblio` pointed at a stub, since the real backend
 * connection has no place in a smoke test — serves that directory statically
 * and lets Chromium click through it. No network needed: failed tiles are
 * noise and get filtered out.
 *
 * What's deliberately tested here is the stuff that's allowed to break at a
 * table with an audience without anyone noticing: capturing a marker, typing
 * that gets saved, corrupted storage, four pucks at once (and therefore the
 * Rust geometry in the wasm), and the messages that must not vanish in
 * silence.
 *
 * Runs directly under Node 24 (`node src/test/smoke.ts`): only type
 * annotations, no TypeScript syntax that Node can't strip away.
 */
import { chromium } from "playwright";
import { build } from "vite";
import http from "node:http";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
);
const work = fs.mkdtempSync(path.join(os.tmpdir(), "pucktable-smoke-"));
const stub = path.join(work, "biblio-stub.ts");
fs.writeFileSync(
    stub,
    `export function defaultClient(){return{` +
        `graph:async()=>({nodes:[],links:[],themes:[]}),` +
        `documents:async()=>[],chat:async function*(){},` +
        `knowledge:async()=>null,fileUrl:()=>""};}\n`,
);
const out = path.join(work, "dist");
await build({
    configFile: path.join(root, "vite.config.ts"),
    root: path.join(root, "exe"),
    logLevel: "warn",
    resolve: { alias: { "@biblio": stub } },
    build: { outDir: out, emptyOutDir: true },
});
// The fixtures live next to index.html and also under /fixtures: the client
// requests them relatively, and the directory is already named that in
// exe/public/.
if (!fs.existsSync(path.join(out, "fixtures"))) {
    console.error("build zonder fixtures");
    process.exit(2);
}
fs.cpSync(path.join(out, "fixtures"), path.join(out, "public", "fixtures"), {
    recursive: true,
});
const serveRoot = out;

const TYPES: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".wasm": "application/wasm",
    ".json": "application/json",
    ".txt": "text/plain",
    ".png": "image/png",
};
const server = http.createServer((req, res) => {
    const [asked = "/"] = (req.url ?? "/").split("?");
    const rel = decodeURIComponent(asked).replace(/^\/+/, "") || "index.html";
    const file = path.join(serveRoot, rel);
    if (
        !file.startsWith(serveRoot) ||
        !fs.existsSync(file) ||
        fs.statSync(file).isDirectory()
    ) {
        res.writeHead(404).end("nee");
        return;
    }
    res.writeHead(200, {
        "Content-Type":
            TYPES[path.extname(file)] || "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
const BASE = "http://127.0.0.1:" + (server.address() as AddressInfo).port;

const W = 1600,
    H = 1000;
const pxPerMM = Math.hypot(W, H) / (43 * 25.4);
const R = 40 * pxPerMM,
    HOLE = R * 0.7; // must follow CFG.puckRadiusMM and PUCK_HOLE
const log: string[] = [];
const ok = (naam: string, goed: boolean) => {
    const regel = (goed ? "\u2713 " : "\u2717 ") + naam;
    log.push(regel);
    console.log(regel);
    if (!goed) process.exitCode = 1;
};

const browser = await chromium.launch(
    process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);

async function newPage(
    uiMode: string,
    {
        twoSided = false,
        base = false,
    }: { twoSided?: boolean; base?: boolean } = {},
) {
    const ctx = await browser.newContext({
        viewport: { width: W, height: H },
    });
    const page = await ctx.newPage();
    await page.addInitScript(
        (o) => {
            try {
                localStorage.clear();
                localStorage.setItem("pucktable-ui-mode", o.m);
                if (o.zijden) localStorage.setItem("pucktable-two-sided", "1");
            } catch (e) {}
        },
        { m: uiMode, zijden: twoSided },
    );
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => {
        if (
            m.type() === "error" &&
            !/tile|tunnel|ERR_|favicon|Failed to load resource/i.test(m.text())
        )
            errs.push(m.text());
    });
    await page.goto(BASE + `/index.html?test${base ? "&base" : ""}`);
    await page.waitForTimeout(900);
    return { page, ctx, errs };
}

// ── 0. the side-by-side Base pipeline is safe when explicitly enabled ──
{
    const { page, ctx, errs } = await newPage("laptop", { base: true });
    const tray = page.locator("#puckDock .traypuck").first();
    const box = await tray.boundingBox();
    if (box !== null) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(W / 2, H / 2, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(400);
    }
    ok(
        "Base-vergelijking draait zonder JS-fouten",
        box !== null &&
            errs.length === 0 &&
            (await page.evaluate(
                () => (window as any).__puck?.tracks().length,
            )) > 0,
    );
    /* Het nieuwe model draait ernaast en raakt niets aan. Het
       programma wordt pas op een `?base`-adres opgehaald, dus even
       wachten tot dat binnen is. */
    await page.waitForTimeout(600);
    const model = await page.evaluate(
        () => (window as any).__base?.model() as string | undefined,
    );
    ok(
        "het model draait ernaast en telt gebeurtenissen",
        typeof model === "string" &&
            model.startsWith("model: Setup") &&
            !model.includes("loading") &&
            /[1-9]\d* events/.test(model),
    );
    ok("en het model heeft niets aangeraakt", errs.length === 0);
    await ctx.close();
}

// ── 1. laptop: drag copy onto the map, tap on the rim vs. tap in the viewing
// hole ──
{
    const { page, ctx, errs } = await newPage("laptop");
    ok("opnameknop is aanwezig", await page.locator("#btnCapA").isVisible());
    await page.click("#btnCapA");
    ok("opnamemenu opent", await page.locator("#capBar").isVisible());
    ok(
        "foto, video en time-lapse zijn beschikbaar",
        (await page.locator("#capBar button").count()) === 3,
    );
    await page.click("#btnCapA");
    const tray = page.locator("#puckDock .traypuck").first();
    ok("puckbalk aanwezig", (await tray.count()) > 0);
    const box = (await tray.boundingBox())!;
    const cx = W / 2,
        cy = H / 2;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(cx, cy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const pinsNow = () =>
        page.evaluate(() => {
            const k =
                "pucktable-" +
                (document.getElementById("sess") as HTMLInputElement).value;
            try {
                return JSON.parse(localStorage.getItem(k) || "[]").length;
            } catch (e) {
                return -1;
            }
        });
    const base = await pinsNow();
    const noteOpen = () =>
        page.evaluate(() => {
            const n = document.getElementById("note") as HTMLElement;
            return (
                getComputedStyle(n).display !== "none" &&
                n.classList.contains("opening")
            );
        });

    // click in the black rim (outside the viewing hole, inside the puck):
    // should not capture anything
    await page.mouse.click(cx + (HOLE + R) / 2, cy);
    await page.waitForTimeout(250);
    ok("tik op de band legt niets vast", (await pinsNow()) === base);
    ok("venster blijft dicht na tik op de band", !(await noteOpen()));

    // Clicking the viewing hole places the mark and opens its option ring.
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(400);
    const puckState = await page.evaluate(() =>
        (window as any).__puck?.tracks(),
    );
    ok(
        "tik in het kijkgat legt vast",
        (await pinsNow()) === base + 1 ||
            (console.log("puckstand:", puckState), false),
    );
    ok("notitievenster opent bij de puck", await noteOpen());
    ok(
        "en opent de opties rond de puck",
        (await page.evaluate(() => (window as any).__puck?.ringOpen())).some(
            Boolean,
        ),
    );

    // Options are selected by tapping their visible segment, never by
    // turning the puck. Pick the second topic and verify the existing mark.
    const option = await page.evaluate(() => {
        const p = (window as any).__puck;
        const t = p.tracks()[0];
        const n = p.topics().length + 1;
        const angle = p.ringStart(n) + (1.5 * Math.PI * 2) / n;
        return {
            x: t.x + Math.cos(angle) * p.ringPX(),
            y: t.y + Math.sin(angle) * p.ringPX(),
            topic: p.topics()[1],
        };
    });
    await page.mouse.click(option.x, option.y);
    await page.waitForTimeout(250);
    const pickedTopic = await page.evaluate(() => {
        const k =
            "pucktable-" +
            (document.getElementById("sess") as HTMLInputElement).value;
        return JSON.parse(localStorage.getItem(k) || "[]").at(-1)?.topic;
    });
    ok(
        "een optie wordt alleen door aanklikken gekozen",
        pickedTopic === option.topic,
    );
    ok(
        "de optiering sluit na de keuze",
        !(await page.evaluate(() => (window as any).__puck?.ringOpen())).some(
            Boolean,
        ),
    );

    await page.click("#noteSave");
    await page.waitForTimeout(150);
    ok(
        "na bewaren verschijnt de optionele contactvraag",
        await page.locator("#contactFollowup").isVisible(),
    );
    await page.fill("#contactName", "Ada Test");
    await page.fill("#contactEmail", "ada@example.com");
    await page.fill("#contactPhone", "0612345678");
    await page.check("#contactConsent");
    await page.click("#contactSave");
    await page.waitForTimeout(750);
    const contact = await page.evaluate(() => {
        const k =
            "pucktable-" +
            (document.getElementById("sess") as HTMLInputElement).value;
        return JSON.parse(localStorage.getItem(k) || "[]").at(-1)?.contact;
    });
    ok(
        "contactgegevens en toestemming blijven bij de bijdrage bewaard",
        contact?.name === "Ada Test" &&
            contact?.email === "ada@example.com" &&
            contact?.phone === "0612345678" &&
            contact?.consent === true &&
            !!contact?.consentAt,
    );

    // a second tap in the viewing hole must not capture twice
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(300);
    ok("geen dubbele markering", (await pinsNow()) === base + 1);

    ok(
        "geen JS-fouten (laptop)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── 1b. the two physical movements directly operate the map ──
{
    const { page, ctx, errs } = await newPage("laptop");
    const tray = page.locator("#puckDock .traypuck").first();
    const box = (await tray.boundingBox())!;
    const cx = W / 2,
        cy = H / 2;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(cx, cy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const zoom0 = await page.evaluate(() => window.MV.zoom);
    await page.keyboard.down("Shift");
    await page.mouse.move(cx + 30, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + 30, { steps: 24 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await page.waitForTimeout(500);
    const zoom1 = await page.evaluate(() => window.MV.zoom);
    ok("draaien aan de puck zoomt de kaart", Math.abs(zoom1 - zoom0) > 0.1);

    const map0 = await page.evaluate(() => ({
        lng: window.MV.lng,
        lat: window.MV.lat,
    }));
    const puck = await page.evaluate(() => (window as any).__puck.tracks()[0]);
    await page.mouse.move(puck.x, puck.y);
    await page.mouse.down();
    await page.mouse.move(puck.x + 90, puck.y + 20, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const map1 = await page.evaluate(() => ({
        lng: window.MV.lng,
        lat: window.MV.lat,
    }));
    ok(
        "de fysieke puck verschuiven beweegt de kaart",
        Math.hypot(map1.lng - map0.lng, map1.lat - map0.lat) > 0.000001,
    );
    ok(
        "geen JS-fouten (directe puckbesturing)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── 2. puck mode: keyboard should appear ──
{
    const { page, ctx, errs } = await newPage("puck");
    const field = page.locator("#sess");
    ok("sessieveld bestaat", (await field.count()) > 0);
    await page.click("#btnSetA");
    await page.waitForTimeout(300);
    // The session name is in a collapsible block; that needs to be opened
    // first. Targeted by its translation key rather than by its label: the
    // table now starts in English, and the label follows the language.
    await page.locator('[data-i18n="sessionHead"]').first().click();
    await page.waitForTimeout(300);
    await field.click();
    await page.waitForTimeout(300);
    ok(
        "eigen toetsenbord verschijnt in de puckstand",
        await page
            .locator("#keyboard")
            .evaluate((k) => k.classList.contains("visible")),
    );
    ok(
        "systeemtoetsenbord blijft uit",
        (await field.evaluate((f) => f.getAttribute("inputmode"))) === "none",
    );
    ok(
        "geen JS-fouten (puck)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── 3. typing is saved immediately, even without pressing Save ──
{
    const { page, ctx, errs } = await newPage("laptop");
    const tray = page.locator("#puckDock .traypuck").first();
    const b = (await tray.boundingBox())!;
    const cx = W / 2,
        cy = H / 2;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(cx, cy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(500);
    await page.locator("#noteTitle").fill("Kapotte stoeptegel");
    await page.waitForTimeout(700);
    const opgeslagen = await page.evaluate(() => {
        const k =
            "pucktable-" +
            (document.getElementById("sess") as HTMLInputElement).value;
        return (JSON.parse(localStorage.getItem(k) || "[]") as any[]).some(
            (p) => p.title === "Kapotte stoeptegel",
        );
    });
    ok("typen wordt bewaard zonder Bewaren", opgeslagen);
    // close the window with Escape and reopen it: the text is still there
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(400);
    ok(
        "tekst staat er nog na sluiten",
        (await page.locator("#noteTitle").inputValue()) ===
            "Kapotte stoeptegel",
    );
    ok(
        "geen JS-fouten (autosave)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── 4. a corrupted marker in storage doesn't take down the render loop ──
{
    const ctx2 = await browser.newContext({
        viewport: { width: W, height: H },
    });
    const page = await ctx2.newPage();
    await page.addInitScript(() => {
        try {
            localStorage.clear();
            localStorage.setItem("pucktable-ui-mode", "laptop");
            localStorage.setItem("pucktable-demo-pins-v1", "1");
            localStorage.setItem(
                "pucktable-sessie-01",
                JSON.stringify([
                    {
                        id: "kapot-1",
                        verdict: "onzin",
                        lat: 51.6,
                        lng: 4.7,
                        title: "x",
                    },
                    {
                        id: "kapot-2",
                        verdict: "good",
                        lat: "geen getal",
                        lng: 4.7,
                    },
                    null,
                    {
                        id: "goed-1",
                        verdict: "good",
                        lat: 51.5866,
                        lng: 4.7759,
                        title: "Deze deugt",
                    },
                ]),
            );
        } catch (e) {}
    });
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/index.html");
    await page.waitForTimeout(1200);
    const n = await page.evaluate(() => {
        const k =
            "pucktable-" +
            (document.getElementById("sess") as HTMLInputElement).value;
        return JSON.parse(localStorage.getItem(k) || "[]").length;
    });
    ok(
        "alleen de bruikbare markering blijft over",
        n === 1 || (console.log("pins:", n), false),
    );
    ok(
        "geen JS-fouten bij een kapotte opslag",
        errs.length === 0 || (console.log(errs.slice(0, 2)), false),
    );
    // and the table still renders: dragging a puck just works
    const tray = page.locator("#puckDock .traypuck").first();
    const b = (await tray.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(W / 2, H / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.mouse.click(W / 2, H / 2);
    await page.waitForTimeout(400);
    ok(
        "puck werkt nog na een kapotte opslag",
        await page.evaluate(
            () =>
                getComputedStyle(
                    document.getElementById("note") as HTMLElement,
                ).display !== "none",
        ),
    );
    await ctx2.close();
}

// ── 5. four pucks at once are all four recognised (grid search) ──
{
    const { page, ctx, errs } = await newPage("laptop");
    const pinsNow = () =>
        page.evaluate(() => {
            const k =
                "pucktable-" +
                (document.getElementById("sess") as HTMLInputElement).value;
            try {
                return JSON.parse(localStorage.getItem(k) || "[]").length;
            } catch (e) {
                return -1;
            }
        });
    const base = await pinsNow();
    const spots: [number, number][] = [
        [300, 240],
        [760, 240],
        [300, 660],
        [760, 660],
    ];
    const trays = page.locator("#puckDock .traypuck");
    for (let i = 0; i < 4; i++) {
        const b = await trays.nth(i).boundingBox();
        if (!b) {
            ok("puck " + (i + 1) + " in de balk", false);
            continue;
        }
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        const spot = spots[i];
        if (!spot) throw new Error(`no drop spot ${i}`);
        await page.mouse.move(spot[0], spot[1], { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);
    }
    for (const [x, y] of spots) {
        await page.mouse.click(x, y);
        await page.waitForTimeout(350);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
    }
    const n = await pinsNow();
    ok(
        "vier pucks, vier markeringen",
        n === base + 4 || (console.log("markeringen erbij:", n - base), false),
    );
    ok(
        "geen JS-fouten (vier pucks)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── 6. search, clear, and the pinned map report what they're doing ──
{
    const { page, ctx, errs } = await newPage("laptop");
    await page.click("#btnSetA");
    await page.waitForTimeout(250);
    // searching without network access: there should be a message, not silence
    await page.click("#btnMapA");
    await page.waitForTimeout(300);
    await page.evaluate(() =>
        document
            .querySelectorAll("#menu .menu-sec")
            .forEach((s) => s.classList.remove("collapsed")),
    );
    await page.waitForTimeout(200);
    const zoek = page.locator("#search");
    await zoek.scrollIntoViewIfNeeded().catch(() => {});
    if (await zoek.isVisible()) {
        await zoek.click();
        await zoek.fill("Ginneken");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1200);
        const t = await page.locator("#searchHint").textContent();
        ok(
            "zoeken geeft terugkoppeling",
            !!(t || "").trim() || (console.log("hint leeg"), false),
        );
    } else ok("zoekveld zichtbaar in het kaartmenu", false);
    ok(
        "geen JS-fouten (zoeken)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── 7. clearing everything requires a second tap, no system dialog ──
{
    const { page, ctx, errs } = await newPage("laptop");
    // "Clear everything" is under the session analytics, not in the menu
    await page.evaluate(() =>
        (document.getElementById("btnAnalytics") as HTMLElement).click(),
    );
    await page.waitForTimeout(500);
    const pinsNow = () =>
        page.evaluate(() => {
            const k =
                "pucktable-" +
                (document.getElementById("sess") as HTMLInputElement).value;
            try {
                return JSON.parse(localStorage.getItem(k) || "[]").length;
            } catch (e) {
                return -1;
            }
        });
    const base = await pinsNow();
    await page.click("#btnWipe");
    await page.waitForTimeout(200);
    ok("eerste tik wist niets", (await pinsNow()) === base);
    ok(
        "knop vraagt om bevestiging",
        /nogmaals|again/i.test(
            (await page.locator("#btnWipe").textContent()) ?? "",
        ),
    );
    await page.click("#btnWipe");
    await page.waitForTimeout(300);
    ok("tweede tik wist wel", (await pinsNow()) === 0);
    ok(
        "geen JS-fouten (wissen)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── 8. the map can be dimmed and made vivid again ──
{
    const { page, ctx, errs } = await newPage("laptop");
    await page.click("#btnMapA");
    await page.waitForTimeout(250);
    await page.evaluate(() =>
        document
            .querySelectorAll("#menu .menu-sec")
            .forEach((s) => s.classList.remove("collapsed")),
    );
    await page.waitForTimeout(200);
    const knop = page.locator("#btnCalm");
    ok(
        "demping staat standaard aan",
        ((await knop.getAttribute("class")) || "").includes("on"),
    );
    await knop.click();
    await page.waitForTimeout(200);
    ok(
        "demping is uit te zetten",
        !((await knop.getAttribute("class")) || "").includes("on"),
    );
    ok(
        "keuze wordt onthouden",
        (await page.evaluate(() => localStorage.getItem("pucktable-calm"))) ===
            "0",
    );
    ok(
        "geen JS-fouten (demping)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── 9. scrolling the menu with a finger, even with a puck on the glass ──
{
    const ctx3 = await browser.newContext({
        viewport: { width: W, height: H },
        hasTouch: true,
    });
    const page = await ctx3.newPage();
    await page.addInitScript(() => {
        try {
            localStorage.clear();
            localStorage.setItem("pucktable-ui-mode", "touch");
        } catch (e) {}
    });
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/index.html");
    await page.waitForTimeout(900);
    await page.click("#btnSetA");
    await page.waitForTimeout(300);
    await page.evaluate(() =>
        document
            .querySelectorAll("#menu .menu-sec")
            .forEach((s) => s.classList.remove("collapsed")),
    );
    await page.waitForTimeout(300);
    const cdp = await page.context().newCDPSession(page);
    const rect = await page.evaluate(() =>
        (document.getElementById("menu") as HTMLElement)
            .getBoundingClientRect()
            .toJSON(),
    );
    const x = rect.x + rect.width / 2,
        y0 = rect.y + rect.height * 0.7;
    // `extra` is a second contact point on the map — a puck lying on the
    // table. That exact thing made the browser blind to the swipe gesture.
    const veeg = async (extra: boolean) => {
        await page.evaluate(
            () =>
                ((document.getElementById("menu") as HTMLElement).scrollTop =
                    0),
        );
        const pts = (p: { x: number; y: number; id: number }) =>
            extra ? [p, { x: 1200, y: 500, id: 9 }] : [p];
        if (extra)
            await cdp.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [{ x: 1200, y: 500, id: 9 }],
            });
        await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: pts({ x, y: y0, id: 1 }),
        });
        for (let i = 1; i <= 8; i++) {
            await cdp.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: pts({ x, y: y0 - i * 22, id: 1 }),
            });
            await page.waitForTimeout(25);
        }
        await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: extra ? [{ x: 1200, y: 500, id: 9 }] : [],
        });
        if (extra)
            await cdp.send("Input.dispatchTouchEvent", {
                type: "touchEnd",
                touchPoints: [],
            });
        await page.waitForTimeout(300);
        return page.evaluate(
            () => (document.getElementById("menu") as HTMLElement).scrollTop,
        );
    };
    const alleen = await veeg(false),
        metPuck = await veeg(true);
    ok(
        "menu scrollt met een vinger",
        alleen > 80 || (console.log("scrollTop:", alleen), false),
    );
    ok(
        "menu scrollt ook met een puck op het glas",
        metPuck > 80 || (console.log("scrollTop met puck:", metPuck), false),
    );
    ok(
        "geen JS-fouten (scrollen)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx3.close();
}

// ── 10. the reset button: learn a key, and holding it down starts over ──
{
    const { page, ctx, errs } = await newPage("laptop");
    await page.click("#btnSetA");
    await page.waitForTimeout(250);
    await page.evaluate(() =>
        document
            .querySelectorAll("#menu .menu-sec")
            .forEach((s) => s.classList.remove("collapsed")),
    );
    await page.waitForTimeout(200);
    await page.click("#btnResetKey");
    await page.waitForTimeout(150);
    await page.keyboard.press("F9");
    await page.waitForTimeout(250);
    ok(
        "de toets wordt onthouden",
        (await page.evaluate(() =>
            localStorage.getItem("pucktable-reset-key"),
        )) === "F9",
    );
    ok(
        "en staat in beeld",
        /F9/.test((await page.locator("#resetKeyHint").textContent()) ?? ""),
    );

    // a short tap should do nothing
    await page.evaluate(() => {
        (window as any).__voor = 1;
    });
    await page.keyboard.press("F9");
    await page.waitForTimeout(400);
    ok(
        "een tik begint niet opnieuw",
        (await page.evaluate(() => (window as any).__voor)) === 1,
    );

    // but holding it down does: the page reloads, so the marker is gone
    await page.keyboard.down("F9");
    await page.waitForTimeout(1400);
    await page.keyboard.up("F9").catch(() => {});
    await page.waitForTimeout(600);
    ok(
        "ingedrukt houden begint opnieuw",
        (await page.evaluate(() => (window as any).__voor)) === undefined,
    );
    ok(
        "geen JS-fouten (resetknop)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── conversation: the block is there, the text stays with the marker ──
{
    const { page, ctx, errs } = await newPage("laptop");
    const tray = page.locator("#puckDock .traypuck").first();
    const b = (await tray.boundingBox())!;
    const cx = W / 2,
        cy = H / 2;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(cx, cy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(500);

    ok(
        "opnameknop staat in het venster",
        await page.locator("#talkBtn").isVisible(),
    );
    ok(
        "knop nodigt uit om het gesprek op te nemen",
        /record conversation|gesprek opnemen/i.test(
            (await page.locator("#talkBtn").textContent()) ?? "",
        ),
    );

    await page
        .locator("#talkText")
        .fill("We staan hier elke ochtend in de file.");
    await page.waitForTimeout(700);
    const bewaard = await page.evaluate(() => {
        const k =
            "pucktable-" +
            (document.getElementById("sess") as HTMLInputElement).value;
        return (JSON.parse(localStorage.getItem(k) || "[]") as any[]).some(
            (p) => /elke ochtend in de file/.test(p.transcript || ""),
        );
    });
    ok("het gesprek wordt bij de markering bewaard", bewaard);

    // Pressing record: without a microphone there should be an explanation,
    // not silence and not an error. If it does work, the button shows
    // recording.
    await page.click("#talkBtn");
    await page.waitForTimeout(1500);
    const gemeld = await page.evaluate(() => ({
        status: (
            (document.getElementById("talkStatus") as HTMLElement)
                .textContent || ""
        ).trim(),
        rec: (
            document.getElementById("talkBtn") as HTMLElement
        ).classList.contains("rec"),
    }));
    ok(
        "opnemen zegt wat er gebeurt (of waarom het niet kan)",
        gemeld.rec ||
            gemeld.status.length > 0 ||
            (console.log("gesprek:", gemeld), false),
    );
    ok(
        "geen JS-fouten (gesprek)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

// ── two pucks at once: same kind, and a window per table side ──
{
    const { page, ctx, errs } = await newPage("touch", { twoSided: true });
    const trays = page.locator("#puckDock .traypuck");
    const pinsNow = () =>
        page.evaluate(() => {
            const k =
                "pucktable-" +
                (document.getElementById("sess") as HTMLInputElement).value;
            try {
                return JSON.parse(localStorage.getItem(k) || "[]").length;
            } catch (e) {
                return -1;
            }
        });
    const zichtbaar = (id: string) =>
        page.evaluate((i) => {
            const n = document.getElementById(i);
            return !!n && getComputedStyle(n).display !== "none";
        }, id);
    // A window or keyboard overlaps the puck tray; close it first.
    const leg = async (i: number, x: number, y: number) => {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(250);
        const b = (await trays.nth(i).boundingBox())!;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.mouse.move(x, y, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(400);
    };
    const base = await pinsNow();

    /* Two pucks of the same kind: the tray must no longer block that. They're
     placed on the left, well outside the puck tray: a puck that ends up on a
     panel slides to the middle (see endTrayDrag) and then no longer sits
     where the test taps. */
    await leg(0, 260, 700);
    await page.mouse.click(260, 700);
    await page.waitForTimeout(500);
    await leg(0, 260, 300);
    await page.mouse.click(260, 300);
    await page.waitForTimeout(500);
    ok(
        "twee pucks van dezelfde soort, twee markeringen",
        (await pinsNow()) === base + 2,
    );

    // tapping a puck that's already placed reopens its window
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    ok("venster is dicht na Escape", !(await zichtbaar("note")));
    await page.mouse.click(260, 700);
    await page.waitForTimeout(500);
    ok(
        "tikken op een vastgelegde puck opent zijn venster weer",
        await zichtbaar("note"),
    );
    ok("en legt niets nieuws vast", (await pinsNow()) === base + 2);

    // the third puck on the other side gets that side's window
    await leg(1, 1150, 240);
    await page.mouse.click(1150, 240);
    await page.waitForTimeout(600);
    ok("de overkant heeft een eigen venster", await zichtbaar("note-b"));
    await page.mouse.click(260, 700);
    await page.waitForTimeout(600);
    ok("en dat van deze kant staat er nog naast", await zichtbaar("note"));
    ok(
        "elk venster hangt aan zijn eigen puck",
        await page.evaluate(
            () =>
                (document.getElementById("note") as HTMLElement).dataset
                    .anchorY !==
                (document.getElementById("note-b") as HTMLElement).dataset
                    .anchorY,
        ),
    );
    ok(
        "twee toetsenborden, één per kant",
        await page.evaluate(
            () =>
                (
                    document.getElementById("keyboard") as HTMLElement
                ).classList.contains("visible") &&
                (
                    document.getElementById("keyboard-b") as HTMLElement
                ).classList.contains("visible"),
        ),
    );
    ok(
        "het toetsenbord van de overkant staat op zijn kop",
        await page.evaluate(
            () =>
                (
                    document.getElementById("keyboard-b") as HTMLElement
                ).classList.contains("flipped") &&
                !(
                    document.getElementById("keyboard") as HTMLElement
                ).classList.contains("flipped"),
        ),
    );

    // typing on one side doesn't end up in the other side's window
    await page.locator("#noteTitle").fill("Kant A");
    await page.locator("#noteTitle-b").fill("Kant B");
    await page.waitForTimeout(700);
    ok(
        "elk venster bewaart zijn eigen bijdrage",
        await page.evaluate(() => {
            const k =
                "pucktable-" +
                (document.getElementById("sess") as HTMLInputElement).value;
            const p = JSON.parse(localStorage.getItem(k) || "[]") as any[];
            return (
                p.some((x) => x.title === "Kant A") &&
                p.some((x) => x.title === "Kant B")
            );
        }),
    );
    ok(
        "geen JS-fouten (twee kanten)",
        errs.length === 0 || (console.log(errs.slice(0, 3)), false),
    );
    await ctx.close();
}

await browser.close();
server.close();
fs.rmSync(work, { recursive: true, force: true });
console.log(log.join("\n"));
console.log(
    process.exitCode
        ? "\nrooktest: er ging iets mis"
        : "\nrooktest: alles goed",
);
