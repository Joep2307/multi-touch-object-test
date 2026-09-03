/* Rooktest voor de participatietafel.
 *
 *   npm run smoke
 *
 * Waarom een eigen harnas en geen vite: deze test hoeft de app niet te bouwen,
 * hij hoeft hem te gebruiken. Hij zet een kopie van index.html, app.js, kg.js,
 * styles.css en de fixtures in een tijdelijke map, hangt er een importmap in
 * die `@biblio` naar een stub wijst (de echte koppeling hoort niet in een
 * rooktest thuis), serveert die map statisch en laat Chromium er doorheen
 * lopen. Geen netwerk nodig: mislukte tegels zijn ruis en worden gefilterd.
 *
 * Wat hier getest wordt is bewust het spul dat aan een tafel met publiek
 * kapot mag gaan zonder dat iemand het merkt: vastleggen, typen dat bewaard
 * blijft, een kapotte opslag, vier pucks tegelijk, en de meldingen die niet
 * in stilte mogen verdwijnen.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "pucktable-smoke-"));
for (const name of ["index.html", "app.js", "kg.js", "speech.js", "styles.css"])
  fs.copyFileSync(path.join(root, name), path.join(work, name));
fs.cpSync(path.join(root, "public"), path.join(work, "public"), { recursive: true });
fs.cpSync(path.join(root, "public", "fixtures"), path.join(work, "fixtures"), { recursive: true });
fs.writeFileSync(path.join(work, "biblio-stub.js"),
  `export function defaultClient(){return{graph:async()=>({nodes:[],links:[]}),documents:async()=>[],chat:async function*(){}};}\n` +
  `export default {defaultClient};\n`);
{
  const page = fs.readFileSync(path.join(work, "index.html"), "utf8");
  const tag = '<script type="module" src="./app.js"></script>';
  if (!page.includes(tag)) { console.error("index.html laadt app.js niet zoals verwacht"); process.exit(2); }
  fs.writeFileSync(path.join(work, "index.html"), page.replace(tag,
    '<script type="importmap">{"imports":{"@biblio":"./biblio-stub.js"}}</script>\n' + tag));
}

const TYPES = {".html":"text/html", ".js":"text/javascript", ".css":"text/css",
               ".json":"application/json", ".txt":"text/plain", ".png":"image/png"};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.join(work, rel);
  if (!file.startsWith(work) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("nee"); return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = "http://127.0.0.1:" + server.address().port;

const W = 1600, H = 1000;
const pxPerMM = Math.hypot(W, H) / (43 * 25.4);
const R = 45 * pxPerMM, HOLE = R * 0.58;   // moet CFG.puckRadiusMM en PUCK_HOLE volgen
const log = [];
const ok = (naam, goed) => { const regel=(goed ? "\u2713 " : "\u2717 ") + naam;
  log.push(regel); console.log(regel); if (!goed) process.exitCode = 1; };

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

async function newPage(uiMode, {twoSided=false}={}){
  const ctx = await browser.newContext({ viewport:{width:W,height:H} });
  const page = await ctx.newPage();
  await page.addInitScript(o=>{ try{ localStorage.clear();
    localStorage.setItem('pucktable-ui-mode',o.m);
    if(o.zijden) localStorage.setItem('pucktable-two-sided','1'); }catch(e){} },
    {m:uiMode, zijden:twoSided});
  const errs=[];
  page.on('pageerror', e=>errs.push(String(e)));
  page.on('console', m=>{ if(m.type()==='error' && !/tile|tunnel|ERR_|favicon|Failed to load resource/i.test(m.text())) errs.push(m.text()); });
  await page.goto(BASE+'/index.html');
  await page.waitForTimeout(900);
  return {page, ctx, errs};
}

// ── 1. laptop: sleepkopie op de kaart, tik op de band vs. tik in het kijkgat ──
{
  const {page, ctx, errs} = await newPage('laptop');
  const tray = page.locator('#puckDock .traypuck').first();
  ok('puckbalk aanwezig', await tray.count()>0);
  const box = await tray.boundingBox();
  const cx=W/2, cy=H/2;
  await page.mouse.move(box.x+box.width/2, box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(cx, cy, {steps:12});
  await page.mouse.up();
  await page.waitForTimeout(400);

  const pinsNow = () => page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    try{ return JSON.parse(localStorage.getItem(k)||'[]').length; }catch(e){ return -1; }
  });
  const base = await pinsNow();
  const noteOpen = () => page.evaluate(()=>{
    const n=document.getElementById('note');
    return getComputedStyle(n).display!=='none' && n.classList.contains('opening');
  });

  // klik in de zwarte band (buiten het kijkgat, binnen de puck): mag niets vastleggen
  await page.mouse.click(cx + (HOLE+R)/2, cy);
  await page.waitForTimeout(250);
  ok('tik op de band legt niets vast', await pinsNow()===base);
  ok('venster blijft dicht na tik op de band', !(await noteOpen()));

  // klik in het kijkgat: legt vast en opent het venster
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  ok('tik in het kijkgat legt vast', await pinsNow()===base+1);
  ok('notitievenster opent bij de puck', await noteOpen());

  // tweede tik in het kijkgat mag niet dubbel vastleggen
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(300);
  ok('geen dubbele markering', await pinsNow()===base+1);

  ok('geen JS-fouten (laptop)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}

// ── 2. puckstand: toetsenbord moet verschijnen ──
{
  const {page, ctx, errs} = await newPage('puck');
  const field = page.locator('#sess');
  ok('sessieveld bestaat', await field.count()>0);
  await page.click('#btnSetA');
  await page.waitForTimeout(300);
  // De sessienaam zit in een uitklapbaar blok; dat moet eerst open.
  await page.getByText('Sessie', {exact:true}).first().click();
  await page.waitForTimeout(300);
  await field.click();
  await page.waitForTimeout(300);
  ok('eigen toetsenbord verschijnt in de puckstand',
     await page.locator('#keyboard').evaluate(k=>k.classList.contains('visible')));
  ok('systeemtoetsenbord blijft uit', await field.evaluate(f=>f.getAttribute('inputmode'))==='none');
  ok('geen JS-fouten (puck)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}


// ── 3. typen wordt meteen bewaard, ook zonder op Bewaren te drukken ──
{
  const {page, ctx, errs} = await newPage('laptop');
  const tray = page.locator('#puckDock .traypuck').first();
  const b = await tray.boundingBox();
  const cx=W/2, cy=H/2;
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down();
  await page.mouse.move(cx,cy,{steps:12}); await page.mouse.up();
  await page.waitForTimeout(400);
  await page.mouse.click(cx,cy); await page.waitForTimeout(500);
  await page.locator('#noteTitle').fill('Kapotte stoeptegel');
  await page.waitForTimeout(700);
  const opgeslagen = await page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    return (JSON.parse(localStorage.getItem(k)||'[]')).some(p=>p.title==='Kapotte stoeptegel');
  });
  ok('typen wordt bewaard zonder Bewaren', opgeslagen);
  // venster sluiten met Escape en opnieuw openen: de tekst staat er nog
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.mouse.click(cx,cy); await page.waitForTimeout(400);
  ok('tekst staat er nog na sluiten', (await page.locator('#noteTitle').inputValue())==='Kapotte stoeptegel');
  ok('geen JS-fouten (autosave)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}

// ── 4. een kapotte markering in de opslag legt de tekenlus niet plat ──
{
  const ctx2 = await browser.newContext({ viewport:{width:W,height:H} });
  const page = await ctx2.newPage();
  await page.addInitScript(()=>{ try{
    localStorage.clear();
    localStorage.setItem('pucktable-ui-mode','laptop');
    localStorage.setItem('pucktable-demo-pins-v1','1');
    localStorage.setItem('pucktable-sessie-01', JSON.stringify([
      {id:'kapot-1',verdict:'onzin',lat:51.6,lng:4.7,title:'x'},
      {id:'kapot-2',verdict:'good',lat:'geen getal',lng:4.7},
      null,
      {id:'goed-1',verdict:'good',lat:51.5866,lng:4.7759,title:'Deze deugt'}
    ]));
  }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(BASE+'/index.html');
  await page.waitForTimeout(1200);
  const n = await page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    return JSON.parse(localStorage.getItem(k)||'[]').length;
  });
  ok('alleen de bruikbare markering blijft over', n===1 || (console.log('pins:',n),false));
  ok('geen JS-fouten bij een kapotte opslag', errs.length===0 || (console.log(errs.slice(0,2)),false));
  // en de tafel tekent nog: een puck slepen werkt gewoon
  const tray = page.locator('#puckDock .traypuck').first();
  const b = await tray.boundingBox();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down();
  await page.mouse.move(W/2,H/2,{steps:10}); await page.mouse.up();
  await page.waitForTimeout(400);
  await page.mouse.click(W/2,H/2); await page.waitForTimeout(400);
  ok('puck werkt nog na een kapotte opslag',
     await page.evaluate(()=>getComputedStyle(document.getElementById('note')).display!=='none'));
  await ctx2.close();
}


// ── 5. vier pucks tegelijk worden alle vier herkend (rasterzoektocht) ──
{
  const {page, ctx, errs} = await newPage('laptop');
  const pinsNow = () => page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    try{ return JSON.parse(localStorage.getItem(k)||'[]').length; }catch(e){ return -1; }
  });
  const base = await pinsNow();
  const spots=[[300,240],[760,240],[300,660],[760,660]];
  const trays = page.locator('#puckDock .traypuck');
  for(let i=0;i<4;i++){
    const b = await trays.nth(i).boundingBox();
    if(!b){ ok('puck '+(i+1)+' in de balk', false); continue; }
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down();
    await page.mouse.move(spots[i][0],spots[i][1],{steps:10}); await page.mouse.up();
    await page.waitForTimeout(250);
  }
  for(const [x,y] of spots){
    await page.mouse.click(x,y); await page.waitForTimeout(350);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  }
  const n = await pinsNow();
  ok('vier pucks, vier markeringen', n===base+4 || (console.log('markeringen erbij:', n-base),false));
  ok('geen JS-fouten (vier pucks)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}


// ── 6. zoeken, wissen en de vastgezette kaart vertellen wat ze doen ──
{
  const {page, ctx, errs} = await newPage('laptop');
  await page.click('#btnSetA'); await page.waitForTimeout(250);
  // zoeken zonder net-toegang: er moet een melding komen, geen stilte
  await page.click('#btnMapA'); await page.waitForTimeout(300);
  await page.evaluate(()=>document.querySelectorAll('#menu .menu-sec').forEach(s=>s.classList.remove('collapsed')));
  await page.waitForTimeout(200);
  const zoek = page.locator('#search');
  await zoek.scrollIntoViewIfNeeded().catch(()=>{});
  if(await zoek.isVisible()){
    await zoek.click(); await zoek.fill('Ginneken');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    const t = await page.locator('#searchHint').textContent();
    ok('zoeken geeft terugkoppeling', !!(t||'').trim() || (console.log('hint leeg'),false));
  } else ok('zoekveld zichtbaar in het kaartmenu', false);
  await ctx.close();
}

// ── 7. alles wissen vraagt om een tweede tik, zonder systeemdialoog ──
{
  const {page, ctx, errs} = await newPage('laptop');
  // "Alles wissen" staat onder de sessie-analyse, niet in het menu
  await page.evaluate(()=>document.getElementById('btnAnalytics').click());
  await page.waitForTimeout(500);
  const pinsNow = () => page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    try{ return JSON.parse(localStorage.getItem(k)||'[]').length; }catch(e){ return -1; }
  });
  const base = await pinsNow();
  await page.click('#btnWipe'); await page.waitForTimeout(200);
  ok('eerste tik wist niets', await pinsNow()===base);
  ok('knop vraagt om bevestiging', /nogmaals|again/i.test(await page.locator('#btnWipe').textContent()));
  await page.click('#btnWipe'); await page.waitForTimeout(300);
  ok('tweede tik wist wel', await pinsNow()===0);
  ok('geen JS-fouten (wissen)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}


// ── 8. de kaart kan gedempt en weer fel ──
{
  const {page, ctx, errs} = await newPage('laptop');
  await page.click('#btnMapA'); await page.waitForTimeout(250);
  await page.evaluate(()=>document.querySelectorAll('#menu .menu-sec').forEach(s=>s.classList.remove('collapsed')));
  await page.waitForTimeout(200);
  const knop = page.locator('#btnCalm');
  ok('demping staat standaard aan', (await knop.getAttribute('class')||'').includes('on'));
  await knop.click(); await page.waitForTimeout(200);
  ok('demping is uit te zetten', !((await knop.getAttribute('class')||'').includes('on')));
  ok('keuze wordt onthouden', await page.evaluate(()=>localStorage.getItem('pucktable-calm'))==='0');
  ok('geen JS-fouten (demping)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}




// ── 9. scrollen in het menu met een vinger, ook met een puck op het glas ──
{
  const ctx3 = await browser.newContext({ viewport:{width:W,height:H}, hasTouch:true });
  const page = await ctx3.newPage();
  await page.addInitScript(()=>{ try{ localStorage.clear(); localStorage.setItem('pucktable-ui-mode','touch'); }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(BASE+'/index.html');
  await page.waitForTimeout(900);
  await page.click('#btnSetA'); await page.waitForTimeout(300);
  await page.evaluate(()=>document.querySelectorAll('#menu .menu-sec').forEach(s=>s.classList.remove('collapsed')));
  await page.waitForTimeout(300);
  const cdp = await page.context().newCDPSession(page);
  const rect = await page.evaluate(()=>document.getElementById('menu').getBoundingClientRect().toJSON());
  const x = rect.x+rect.width/2, y0 = rect.y+rect.height*0.7;
  // `extra` is een tweede contactpunt op de kaart — een puck die op tafel ligt.
  // Precies dat maakte de browser blind voor het veeggebaar.
  const veeg = async extra => {
    await page.evaluate(()=>document.getElementById('menu').scrollTop=0);
    const pts = p => extra ? [p,{x:1200,y:500,id:9}] : [p];
    if(extra) await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:1200,y:500,id:9}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts({x,y:y0,id:1})});
    for(let i=1;i<=8;i++){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts({x,y:y0-i*22,id:1})});
      await page.waitForTimeout(25);
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints: extra?[{x:1200,y:500,id:9}]:[]});
    if(extra) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(300);
    return page.evaluate(()=>document.getElementById('menu').scrollTop);
  };
  const alleen = await veeg(false), metPuck = await veeg(true);
  ok('menu scrollt met een vinger', alleen>80 || (console.log('scrollTop:',alleen),false));
  ok('menu scrollt ook met een puck op het glas', metPuck>80 || (console.log('scrollTop met puck:',metPuck),false));
  ok('geen JS-fouten (scrollen)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx3.close();
}

// ── 10. de resetknop: toets leren, en ingedrukt houden begint opnieuw ──
{
  const {page, ctx, errs} = await newPage('laptop');
  await page.click('#btnSetA'); await page.waitForTimeout(250);
  await page.evaluate(()=>document.querySelectorAll('#menu .menu-sec').forEach(s=>s.classList.remove('collapsed')));
  await page.waitForTimeout(200);
  await page.click('#btnResetKey'); await page.waitForTimeout(150);
  await page.keyboard.press('F9'); await page.waitForTimeout(250);
  ok('de toets wordt onthouden', await page.evaluate(()=>localStorage.getItem('pucktable-reset-key'))==='F9');
  ok('en staat in beeld', /F9/.test(await page.locator('#resetKeyHint').textContent()));

  // een korte tik mag niets doen
  await page.evaluate(()=>{ window.__voor=1; });
  await page.keyboard.press('F9'); await page.waitForTimeout(400);
  ok('een tik begint niet opnieuw', await page.evaluate(()=>window.__voor)===1);

  // ingedrukt houden wel: de pagina herlaadt, dus het merkteken is weg
  await page.keyboard.down('F9');
  await page.waitForTimeout(1400);
  await page.keyboard.up('F9').catch(()=>{});
  await page.waitForTimeout(600);
  ok('ingedrukt houden begint opnieuw', await page.evaluate(()=>window.__voor)===undefined);
  ok('geen JS-fouten (resetknop)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}

// ── gesprek: het blok staat er, de tekst blijft bij de markering ──
{
  const {page, ctx, errs} = await newPage('laptop');
  const tray = page.locator('#puckDock .traypuck').first();
  const b = await tray.boundingBox();
  const cx=W/2, cy=H/2;
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down();
  await page.mouse.move(cx,cy,{steps:12}); await page.mouse.up();
  await page.waitForTimeout(400);
  await page.mouse.click(cx,cy); await page.waitForTimeout(500);

  ok('opnameknop staat in het venster', await page.locator('#talkBtn').isVisible());
  ok('knop heet Gesprek opnemen', (await page.locator('#talkBtn').textContent()).includes('Gesprek opnemen'));

  await page.locator('#talkText').fill('We staan hier elke ochtend in de file.');
  await page.waitForTimeout(700);
  const bewaard = await page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    return (JSON.parse(localStorage.getItem(k)||'[]')).some(p=>/elke ochtend in de file/.test(p.transcript||''));
  });
  ok('het gesprek wordt bij de markering bewaard', bewaard);

  // Op opnemen drukken: zonder microfoon hoort er een uitleg te komen, geen
  // stilte en geen fout. Lukt het wel, dan staat de knop op opnemen.
  await page.click('#talkBtn'); await page.waitForTimeout(1500);
  const gemeld = await page.evaluate(()=>({
    status:(document.getElementById('talkStatus').textContent||'').trim(),
    rec:document.getElementById('talkBtn').classList.contains('rec'),
  }));
  ok('opnemen zegt wat er gebeurt (of waarom het niet kan)',
     gemeld.rec || gemeld.status.length>0 || (console.log('gesprek:',gemeld),false));
  ok('geen JS-fouten (gesprek)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}

// ── twee pucks tegelijk: dezelfde soort, en een venster per tafelkant ──
{
  const {page, ctx, errs} = await newPage('touch', {twoSided:true});
  const trays = page.locator('#puckDock .traypuck');
  const pinsNow = () => page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    try{ return JSON.parse(localStorage.getItem(k)||'[]').length; }catch(e){ return -1; }
  });
  const zichtbaar = id => page.evaluate(i=>{
    const n=document.getElementById(i);
    return !!n && getComputedStyle(n).display!=='none';
  }, id);
  // Een venster of toetsenbord ligt over de puckbalk heen; eerst dicht.
  const leg = async (i,x,y) => {
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    const b=await trays.nth(i).boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down();
    await page.mouse.move(x,y,{steps:12}); await page.mouse.up();
    await page.waitForTimeout(400);
  };
  const base = await pinsNow();

  /* Twee pucks van dezelfde soort: de balk mag dat niet meer blokkeren.
     Ze liggen links, ruim buiten de puckbalk: een puck die op een paneel
     terechtkomt schuift naar het midden (zie endTrayDrag) en ligt dan niet
     meer waar de test tikt. */
  await leg(0,260,700);
  await page.mouse.click(260,700); await page.waitForTimeout(500);
  await leg(0,260,300);
  await page.mouse.click(260,300); await page.waitForTimeout(500);
  ok('twee pucks van dezelfde soort, twee markeringen', await pinsNow()===base+2);

  // een tik op een puck die al vastligt opent zijn venster opnieuw
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  ok('venster is dicht na Escape', !(await zichtbaar('note')));
  await page.mouse.click(260,700); await page.waitForTimeout(500);
  ok('tikken op een vastgelegde puck opent zijn venster weer', await zichtbaar('note'));
  ok('en legt niets nieuws vast', await pinsNow()===base+2);

  // de derde puck aan de overkant krijgt het venster van díe kant
  await leg(1,1150,240);
  await page.mouse.click(1150,240); await page.waitForTimeout(600);
  ok('de overkant heeft een eigen venster', await zichtbaar('note-b'));
  await page.mouse.click(260,700); await page.waitForTimeout(600);
  ok('en dat van deze kant staat er nog naast', await zichtbaar('note'));
  ok('elk venster hangt aan zijn eigen puck', await page.evaluate(()=>
    document.getElementById('note').dataset.anchorY!==document.getElementById('note-b').dataset.anchorY));
  ok('twee toetsenborden, één per kant', await page.evaluate(()=>
    document.getElementById('keyboard').classList.contains('visible') &&
    document.getElementById('keyboard-b').classList.contains('visible')));
  ok('het toetsenbord van de overkant staat op zijn kop', await page.evaluate(()=>
    document.getElementById('keyboard-b').classList.contains('flipped') &&
    !document.getElementById('keyboard').classList.contains('flipped')));

  // typen aan de ene kant komt niet in het venster van de andere terecht
  await page.locator('#noteTitle').fill('Kant A');
  await page.locator('#noteTitle-b').fill('Kant B');
  await page.waitForTimeout(700);
  ok('elk venster bewaart zijn eigen bijdrage', await page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    const p=JSON.parse(localStorage.getItem(k)||'[]');
    return p.some(x=>x.title==='Kant A') && p.some(x=>x.title==='Kant B');
  }));
  ok('geen JS-fouten (twee kanten)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}

// ── puck herkennen: "Volgende puck" mag niet dezelfde puck opnieuw pakken ──
{
  const ctx4 = await browser.newContext({ viewport:{width:W,height:H}, hasTouch:true });
  const page = await ctx4.newPage();
  await page.addInitScript(()=>{ try{ localStorage.clear(); localStorage.setItem('pucktable-ui-mode','touch'); }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(BASE+'/index.html'); await page.waitForTimeout(900);
  await page.click('#btnSetA'); await page.waitForTimeout(300);
  await page.evaluate(()=>document.querySelectorAll('#menu .menu-sec').forEach(s=>s.classList.remove('collapsed')));
  await page.waitForTimeout(200);
  await page.click('#btnRecognise'); await page.waitForTimeout(300);

  // Drie contactpunten: een puck die op tafel ligt en blijft liggen.
  const cdp = await page.context().newCDPSession(page);
  const puck = [{x:520,y:600,id:1},{x:640,y:620,id:2},{x:575,y:700,id:3}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:puck});
  await page.waitForTimeout(1500);
  ok('drie contactpunten worden gemeten', await page.locator('.learn-pick').count()>0);

  await page.locator('.learn-pick').first().click(); await page.waitForTimeout(300);
  ok('de meting wordt toegewezen', await page.locator('#btnLearnAgain').count()===1);

  // De puck ligt er nog. "Volgende puck" hoort te wachten tot het glas leeg is,
  // anders meet hij dezelfde puck nog een keer terwijl jij de tweede pakt.
  await page.click('#btnLearnAgain'); await page.waitForTimeout(1500);
  ok('volgende puck wacht tot het glas leeg is',
     await page.locator('#btnLearnAnyway').count()===1 && await page.locator('.learn-pick').count()===0);
  ok('en zegt hoeveel er nog ligt', /3/.test(await page.locator('#learnStatus').textContent()));

  // Puck van tafel: nu mag de meting weer beginnen.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(400);
  ok('zodra het glas leeg is telt de volgende puck', await page.locator('#btnLearnAnyway').count()===0);
  ok('geen JS-fouten (puck herkennen)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx4.close();
}

await browser.close();
server.close();
fs.rmSync(work, { recursive: true, force: true });
console.log(log.join("\n"));
console.log(process.exitCode ? "\nrooktest: er ging iets mis" : "\nrooktest: alles goed");
