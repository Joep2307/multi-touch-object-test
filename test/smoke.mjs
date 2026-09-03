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
  // Overal `?test`: dan staan de maten van de ring en de themalijst op
  // `window.__puck`, en hoeft geen enkel blok ze over te schrijven.
  await page.goto(BASE+'/index.html?test');
  await page.waitForTimeout(900);
  return {page, ctx, errs};
}

/* Een markering plaatsen is sinds de omgooide bediening twee tikken: eerst in
   het kijkgat (dat haalt de thema's tevoorschijn) en dan op een thema (dat
   legt vast). Waar dat thema ligt rekent de test uit met de maten van de app
   zelf, zodat een andere ringgrootte de test niet stilletjes laat missen. */
async function themaPunt(page,x,y,i){
  return page.evaluate(o=>{
    const P=window.__puck, n=P.topics().length+1;
    const a=P.ringStart(n)+(o.i+0.5)*Math.PI*2/n, r=P.ringPX();
    return {x:o.x+Math.cos(a)*r, y:o.y+Math.sin(a)*r};
  },{x,y,i});
}
async function plaatsMarkering(page,x,y,i=0){
  await page.mouse.click(x,y); await page.waitForTimeout(250);
  const q=await themaPunt(page,x,y,i);
  await page.mouse.click(q.x,q.y); await page.waitForTimeout(400);
}

// ── 1. laptop: sleepkopie op de kaart, tik op de band vs. tik in het kijkgat ──
{
  const {page, ctx, errs} = await newPage('laptop');
  const tray = page.locator('#puckDock .traypuck').first();
  ok('puckbalk aanwezig', await tray.count()>0);
  const help=page.locator('#puckHelp');
  const helpState=await help.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {right:innerWidth-r.right,bottom:innerHeight-r.bottom,
            anim:getComputedStyle(el.querySelector('.help-turn .help-puck')).animationName};
  });
  ok('korte puckuitleg staat rechtsonder', await help.isVisible()&&helpState.right<25&&helpState.bottom<25);
  ok('de uitleg toont drie handelingen', await help.locator('.puck-help-step').count()===3);
  ok('de puckuitleg beweegt', helpState.anim==='helpTurn');
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

  // klik in het kijkgat: haalt de thema's tevoorschijn, meer niet
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(300);
  ok("tik in het kijkgat opent de thema's",
     (await page.evaluate(()=>window.__puck.ringOpen())).some(Boolean));
  ok('en legt zelf niets vast', await pinsNow()===base);

  // en dan het thema: dat legt vast en opent het venster
  const thema0 = await themaPunt(page,cx,cy,0);
  await page.mouse.click(thema0.x, thema0.y);
  await page.waitForTimeout(400);
  ok('tik op een thema legt vast', await pinsNow()===base+1);
  ok('notitievenster opent bij de puck', await noteOpen());
  ok('de ring gaat daarna weer dicht',
     !(await page.evaluate(()=>window.__puck.ringOpen())).some(Boolean));

  // De bijdrage is al veilig opgeslagen voordat de optionele contactvraag
  // verschijnt. Alleen met expliciete toestemming komen gegevens bij de puck.
  await page.click('#noteSave');
  await page.waitForTimeout(150);
  ok('na bewaren verschijnt de optionele contactvraag',
     await page.locator('#contactFollowup').isVisible());
  await page.fill('#contactName','Ada Test');
  await page.fill('#contactEmail','ada@example.com');
  await page.fill('#contactPhone','0612345678');
  await page.check('#contactConsent');
  await page.click('#contactSave');
  await page.waitForTimeout(750);
  const contact=await page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    return JSON.parse(localStorage.getItem(k)||'[]').at(-1)?.contact;
  });
  ok('contactgegevens en toestemming blijven bij de bijdrage bewaard',
     contact?.name==='Ada Test'&&contact?.email==='ada@example.com'&&
     contact?.phone==='0612345678'&&contact?.consent===true&&!!contact?.consentAt);

  // nog een ronde langs dezelfde weg mag niet dubbel vastleggen
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await plaatsMarkering(page, cx, cy, 0);
  ok('geen dubbele markering', await pinsNow()===base+1);

  ok('geen JS-fouten (laptop)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}

// ── 2. puckstand: toetsenbord moet verschijnen ──
{
  const {page, ctx, errs} = await newPage('puck');
  const field = page.locator('#sess');
  ok('sessieveld bestaat', await field.count()>0);
  ok('de muisaanwijzer is weg in de puckstand',
     await page.locator('#btnSetA').evaluate(n=>getComputedStyle(n).cursor)==='none');
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


// ── 3. invoer blijft werken met een fysieke puck op het glas ──
// Een fysieke puck houdt meerdere aanrakingen op het glas. Invoervelden en het
// schermtoetsenbord moeten dan nog steeds op een extra vingertik reageren.
{
  const ctx = await browser.newContext({ viewport:{width:W,height:H}, hasTouch:true });
  const page = await ctx.newPage();
  await page.addInitScript(()=>{ try{ localStorage.clear(); localStorage.setItem('pucktable-ui-mode','touch'); }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(BASE+'/index.html?test'); await page.waitForTimeout(900);

  const tray=page.locator('#puckDock .traypuck').first(), b=await tray.boundingBox();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down();
  await page.mouse.move(W/2,H/2,{steps:10}); await page.mouse.up();
  await page.waitForTimeout(350); await plaatsMarkering(page,W/2,H/2,0);
  await page.evaluate(()=>document.getElementById('noteSave').click());
  await page.waitForTimeout(250);

  const cdp=await page.context().newCDPSession(page);
  const puck=[{x:70,y:430,id:1},{x:135,y:480,id:2},{x:205,y:425,id:3},
              {x:270,y:490,id:4},{x:335,y:430,id:5}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:puck});
  const tik=async selector=>{
    const r=await page.locator(selector).boundingBox();
    const finger={x:r.x+r.width/2,y:r.y+r.height/2,id:20};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:puck.concat(finger)});
    await page.waitForTimeout(70);
    // Bij touchEnd zijn dit de punten die eindigen, niet de punten die blijven.
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[finger]});
    await page.waitForTimeout(120);
  };
  await tik('#contactEmail');
  ok('contactveld blijft te kiezen terwijl de puck ligt',
     await page.evaluate(()=>document.activeElement?.id)==='contactEmail');
  await tik('#keyboard button[data-key="a"]');
  ok('schermtoetsenbord typt terwijl de puck ligt',
     await page.locator('#contactEmail').inputValue()==='a');
  await tik('#contactConsent');
  ok('toestemming is aan te vinken terwijl de puck ligt',
     await page.locator('#contactConsent').isChecked());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:puck});
  ok('geen JS-fouten (typen met puck)', errs.length===0 || (console.log(errs.slice(0,3)),false));
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
  await plaatsMarkering(page,cx,cy,0);
  await page.locator('#noteTitle').fill('Kapotte stoeptegel');
  await page.waitForTimeout(700);
  const opgeslagen = await page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    return (JSON.parse(localStorage.getItem(k)||'[]')).some(p=>p.title==='Kapotte stoeptegel');
  });
  ok('typen wordt bewaard zonder Bewaren', opgeslagen);
  // Venster sluiten met Escape en opnieuw openen: de tekst staat er nog. Het
  // venster terughalen doe je met een tik op de zwarte band — het kijkgat is
  // van de thema's.
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.mouse.click(cx+(HOLE+R)/2,cy); await page.waitForTimeout(400);
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
  await page.goto(BASE+'/index.html?test');
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
  await plaatsMarkering(page,W/2,H/2,0);
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
    await plaatsMarkering(page,x,y,0);
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
  await plaatsMarkering(page,cx,cy,0);

  ok('opnameknop staat in het venster', await page.locator('#talkBtn').isVisible());
  ok('knop heet Gesprek opnemen', (await page.locator('#talkBtn').textContent()).includes('Gesprek opnemen'));

  // De taal hoort bij dit gesprek, niet bij de tafel. Kan deze browser niets
  // uitschrijven, dan valt er niets te kiezen en hoort de kiezer weg te
  // blijven; staat hij er wel, dan is precies één taal aan.
  const taalkeuze = await page.evaluate(()=>{
    const box=document.getElementById('talkLang');
    if(!box) return null;
    const aan=[...box.querySelectorAll('button')]
      .filter(b=>b.getAttribute('aria-pressed')==='true'&&b.style.display!=='none');
    return {zichtbaar:box.style.display!=='none', aan:aan.map(b=>b.id)};
  });
  ok('de taalkiezer staat in het venster', taalkeuze!==null);
  ok('er staat precies één taal aan (of de kiezer blijft weg)',
     !taalkeuze || !taalkeuze.zichtbaar || taalkeuze.aan.length===1
     || (console.log('taalkeuze:',taalkeuze),false));

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
  await plaatsMarkering(page,260,700,0);
  await leg(0,260,300);
  await plaatsMarkering(page,260,300,0);
  ok('twee pucks van dezelfde soort, twee markeringen', await pinsNow()===base+2);

  /* Een tik op de zwarte band van een puck die al vastligt opent zijn venster
     opnieuw. Op de band, niet in het kijkgat: dat is sinds de omgooide
     bediening van de thema's. */
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  ok('venster is dicht na Escape', !(await zichtbaar('note')));
  await page.mouse.click(260+(HOLE+R)/2,700); await page.waitForTimeout(500);
  ok('tikken op een vastgelegde puck opent zijn venster weer', await zichtbaar('note'));
  ok('en legt niets nieuws vast', await pinsNow()===base+2);

  // de derde puck aan de overkant krijgt het venster van díe kant
  await leg(1,1150,240);
  await plaatsMarkering(page,1150,240,0);
  ok('de overkant heeft een eigen venster', await zichtbaar('note-b'));
  await page.mouse.click(260+(HOLE+R)/2,700); await page.waitForTimeout(600);
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

// ── puck herkennen: de tweede puck mag ernaast, zonder de eerste weg te halen ──
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

  const cdp = await page.context().newCDPSession(page);
  // Twee duidelijk verschillende driehoeken, ver genoeg uit elkaar om nooit
  // samen als één puck gelezen te worden.
  const puckA = [{x:520,y:600,id:1},{x:640,y:620,id:2},{x:575,y:700,id:3}];
  const puckB = [{x:1000,y:300,id:4},{x:1220,y:310,id:5},{x:1080,y:420,id:6}];
  const status = () => page.locator('#learnStatus').textContent();

  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:puckA});
  await page.waitForTimeout(1500);
  ok('drie contactpunten worden gemeten', await page.locator('.learn-pick').count()>0);
  await page.locator('.learn-pick').first().click(); await page.waitForTimeout(300);
  ok('de meting wordt toegewezen', await page.locator('#btnLearnAgain').count()===1);

  // De eerste puck blijft liggen. De tafel kent hem nu, dus hij hoort niet meer
  // mee te tellen -- en er hoeft niets opgetild te worden.
  await page.click('#btnLearnAgain'); await page.waitForTimeout(600);
  ok('de ingelezen puck mag blijven liggen',
     await page.locator('#btnLearnAnyway').count()===0);
  ok('en de tafel zegt dat hij hem al kent', /telt niet mee/.test(await status()));

  // Tweede puck ernaast, zonder de eerste eraf te halen.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:puckA.concat(puckB)});
  await page.waitForTimeout(1600);
  ok('de tweede puck wordt gemeten terwijl de eerste blijft liggen',
     await page.locator('.learn-pick').count()>0);
  const gemeten = await status();
  ok('en het is een andere driehoek dan de eerste',
     !/0\.84[0-9]? \/ 0\.93/.test(gemeten) || (console.log('meting:',gemeten),false));

  await page.locator('.learn-pick').nth(1).click(); await page.waitForTimeout(300);
  ok('twee pucks ingelezen zonder het glas leeg te maken', await page.evaluate(()=>{
    const t=JSON.parse(localStorage.getItem('pucktable-templates')||'[]');
    return t.filter(x=>x.learnedAt).length===2;
  }));
  ok('geen JS-fouten (puck herkennen)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await ctx4.close();
}

// ── vijf pootjes op een ring: hoek, ruis, en vier pucks uit elkaar houden ──
{
  /* Dit is de rekenkant van de herkenning, zonder tafel: met ?test staan
     `padsFor` en `recognise` op window. We leggen elke puck onder vijf hoeken
     neer, met een halve millimeter ruis op elk pootje, en kijken of er precies
     één puck uit komt — de juiste — en of de gemeten hoek klopt. */
  const ctx5 = await browser.newContext({ viewport:{width:W,height:H}, hasTouch:true });
  const page = await ctx5.newPage();
  await page.addInitScript(()=>{ try{ localStorage.clear(); }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(BASE+'/index.html?test'); await page.waitForTimeout(900);

  const uit = await page.evaluate(()=>{
    const P=window.__puck; if(!P) return {fout:'geen luikje'};
    const k=P.pxPerMM(), rijen=[];
    const leg=(tpl,deg,cx,cy)=>{
      const rot=deg*Math.PI/180, c=Math.cos(rot), s=Math.sin(rot);
      return P.padsFor(tpl,k).map((p,i)=>({
        // een halve millimeter ruis, vast patroon zodat de test niet wisselt
        x:cx+p.x*c-p.y*s+((i*37%7)-3)*0.17*k,
        y:cy+p.x*s+p.y*c+((i*53%7)-3)*0.17*k}));
    };
    const graden=a=>((a*180/Math.PI)%360+360)%360;
    for(const tpl of P.templates()) for(const deg of [0,37,123,250,318]){
      const r=P.recognise(leg(tpl,deg,800,500));
      const p0=r.pucks[0];
      rijen.push({id:tpl.id,deg,aantal:r.pucks.length,gezien:p0?p0.tpl.id:null,
                  mis:p0?Math.min(Math.abs(graden(p0.angle)-deg),360-Math.abs(graden(p0.angle)-deg)):999});
    }
    // twee ringpucks naast elkaar
    const t=P.templates();
    const paar=P.recognise(leg(t[0],20,500,500).concat(leg(t[2],200,500+140*k,500)));
    // vijf punten die niet op een cirkel liggen zijn geen puck
    const rommel=P.recognise([{x:400,y:400},{x:470,y:405},{x:520,y:520},
                              {x:410,y:560},{x:600,y:430}]);
    return {rijen,paar:paar.pucks.map(x=>x.tpl.id).sort(),rommel:rommel.pucks.length};
  });

  ok('het testluikje bestaat met ?test', !uit.fout);
  if(!uit.fout){
    const fout=uit.rijen.filter(r=>r.aantal!==1||r.gezien!==r.id);
    ok('elke ringpuck wordt onder elke hoek als zichzelf herkend',
       fout.length===0 || (console.log('mis:',fout.slice(0,4)),false));
    const hoekfout=uit.rijen.filter(r=>r.mis>6);
    ok('en de gemeten hoek klopt binnen 6°',
       hoekfout.length===0 || (console.log('hoekfout:',hoekfout.slice(0,4)),false));
    ok('twee ringpucks naast elkaar worden allebei gezien',
       uit.paar.length===2 || (console.log('paar:',uit.paar),false));
    ok('vijf losse vingers zijn geen puck', uit.rommel===0);
  }
  ok('geen JS-fouten (ringpucks)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx5.close();
}

// ── een pootje dat wegvalt: de puck blijft staan, en de hoek springt niet ──
{
  /* De twee dingen waar de tafel in de praktijk op stukging. Een: bij precies
     één stand sprong de gemeten hoek 72°, omdat een pootje dat op 0° uitkwam in
     de ene som vooraan en in de andere achteraan stond. Twee: een pootje dat
     even geen contact maakt — een contactvlak van 2 mm is klein — liet de hele
     puck knipperen. Vier punten op zijn eigen cirkel zijn genoeg om hem vast
     te houden. */
  const ctx6 = await browser.newContext({ viewport:{width:W,height:H}, hasTouch:true });
  const page = await ctx6.newPage();
  await page.addInitScript(()=>{ try{ localStorage.clear(); localStorage.setItem('pucktable-ui-mode','touch'); }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(BASE+'/index.html?test'); await page.waitForTimeout(900);

  const sprongen = await page.evaluate(()=>{
    const P=window.__puck, k=P.pxPerMM(), uit=[];
    const graden=a=>((a*180/Math.PI)%360+360)%360;
    for(const tpl of P.templates()) for(let deg=0;deg<360;deg+=15){
      const r=deg*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
      const pts=P.padsFor(tpl,k).map(p=>({x:900+p.x*c-p.y*s, y:500+p.x*s+p.y*c}));
      const p0=P.recognise(pts).pucks[0];
      const mis=p0?Math.min(Math.abs(graden(p0.angle)-deg),360-Math.abs(graden(p0.angle)-deg)):999;
      if(mis>2) uit.push({id:tpl.id,deg,mis:+mis.toFixed(1)});
    }
    return uit;
  });
  ok('de hoek klopt bij elke stand van de puck',
     sprongen.length===0 || (console.log('sprongen:',sprongen.slice(0,4)),false));

  const cdp = await page.context().newCDPSession(page);
  const pads = await page.evaluate(()=>{
    const P=window.__puck, k=P.pxPerMM();
    return P.padsFor(P.templates()[1],k)
            .map((p,i)=>({x:Math.round(900+p.x), y:Math.round(500+p.y), id:i+1}));
  });
  const staat = () => page.evaluate(()=>window.__puck.tracks());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pads});
  await page.waitForTimeout(400);
  const eerst = await staat();
  ok('vijf pootjes geven één puck',
     eerst.length===1 && eerst[0].id==='puck-02' || (console.log('eerst:',eerst),false));

  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pads.slice(1)});
  await page.waitForTimeout(400);
  const daarna = await staat();
  ok('met vier pootjes blijft dezelfde puck staan',
     daarna.length===1 && daarna[0].id==='puck-02' && daarna[0].state==='recognised'
     || (console.log('na uitval:',daarna),false));
  ok('en hij verschuift daarbij nauwelijks',
     daarna.length===1 && eerst.length===1 &&
     Math.hypot(daarna[0].x-eerst[0].x,daarna[0].y-eerst[0].y)<14
     || (console.log('verschoven:',daarna,eerst),false));

  /* Eén foutieve herkenning op exact dezelfde plek mag niet naast de oude
     track een tweede puck openen. Dit is wat op de fysieke tafel als twee
     bijna overlappende schijven zichtbaar was. */
  const anderePads = await page.evaluate(()=>{
    const P=window.__puck, k=P.pxPerMM();
    return P.padsFor(P.templates()[2],k)
            .map((p,i)=>({x:Math.round(900+p.x), y:Math.round(500+p.y), id:i+1}));
  });
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:anderePads});
  await page.waitForTimeout(80);
  const tijdensWissel = await staat();
  ok('een korte soortwissel tekent geen tweede puck',
     tijdensWissel.length===1 || (console.log('dubbel:',tijdensWissel),false));

  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  ok('geen JS-fouten (pootje weg)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx6.close();
}

// ── de ring is de themalijst, en die komt uit het kijkgat ──
{
  /* De bediening is omgegooid: draaien zoomt, schuiven pant, en het menu met
     standen is weg. Wat overblijft moet kloppen: om een liggende puck staat
     niets, een tik in het kijkgat haalt de thema's tevoorschijn, een tik op
     een thema legt vast en laat de ring weer verdwijnen, en `Terug` sluit hem
     zonder iets vast te leggen. Een tik op de ring mag nooit zelf een
     markering plaatsen — dat is het kijkgat. Met ?test staan de maten van de
     ring op window, zodat de test rekent met wat de app tekent. */
  const {page, ctx, errs} = await newPage('laptop');
  const cx=W/2, cy=H/2;
  const pins = () => page.evaluate(()=>{
    const k='pucktable-'+document.getElementById('sess').value;
    try{ return JSON.parse(localStorage.getItem(k)||'[]'); }catch(e){ return []; }
  });
  const ringOpen = () => page.evaluate(()=>window.__puck.ringOpen().some(Boolean));

  const tray = page.locator('#puckDock .traypuck').first();
  const box = await tray.boundingBox();
  await page.mouse.move(box.x+box.width/2, box.y+box.height/2);
  await page.mouse.down(); await page.mouse.move(cx,cy,{steps:12}); await page.mouse.up();
  await page.waitForTimeout(400);

  ok('om een liggende puck staat geen ring', !(await ringOpen()));

  // Sessie-01 heeft voorbeeldmarkeringen; tellen doen we vanaf wat er al ligt.
  const basis = (await pins()).length;
  const lijst = await page.evaluate(()=>window.__puck.topics());

  // Terug is de laatste optie: hij sluit de ring en legt niets vast.
  await page.mouse.click(cx,cy); await page.waitForTimeout(250);
  const terug = await themaPunt(page,cx,cy,lijst.length);
  await page.mouse.click(terug.x,terug.y); await page.waitForTimeout(300);
  ok('Terug sluit de ring', !(await ringOpen()));
  ok('en legt niets vast', (await pins()).length===basis);

  // Het tweede thema: de markering komt er en draagt dat thema.
  await plaatsMarkering(page,cx,cy,1);
  const eerste = (await pins()).pop();
  ok('een tik op een thema legt de markering vast met dat thema',
     (await pins()).length===basis+1 && eerste && eerste.topic===lijst[1]
     || (console.log('thema:',eerste&&eerste.topic,'verwacht',lijst[1]),false));

  // Dezelfde puck, een ander thema: de markering die er ligt verandert mee en
  // er komt er geen tweede bij.
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  await plaatsMarkering(page,cx,cy,2);
  const daarna = (await pins()).pop();
  ok('een tweede thema zet de markering om in plaats van er een bij te leggen',
     (await pins()).length===basis+1 && daarna && daarna.topic===lijst[2]
     || (console.log('thema:',daarna&&daarna.topic,'verwacht',lijst[2]),false));

  ok('geen JS-fouten (ring aantikken)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}

// ── draaien zoomt, duwen reist ──
{
  /* De kern van de omgegooide bediening, en het enige stuk dat je aan een
     tafel niet even naleest: er is geen stand meer waarin de puck de kaart
     bedient, dus elke draai en elke duw komt meteen op de kaart terecht.
     Met een sleepkopie is dat na te doen: het wiel over een puck draait hem
     (zie de wheel-afhandeling), en slepen verschuift hem. */
  const {page, ctx, errs} = await newPage('laptop');
  const cx=W/2, cy=H/2;
  const view = () => page.evaluate(()=>window.__puck.view());

  const tray = page.locator('#puckDock .traypuck').first();
  const box = await tray.boundingBox();
  await page.mouse.move(box.x+box.width/2, box.y+box.height/2);
  await page.mouse.down(); await page.mouse.move(cx,cy,{steps:12}); await page.mouse.up();
  await page.waitForTimeout(500);

  // Met de klok mee een kwartslag, in stapjes: een puck die in één beeld een
  // kwartslag maakt is voor de herkenning geen draai maar een andere puck.
  const voor = await view();
  await page.mouse.move(cx,cy);
  for(let k=0;k<8;k++){ await page.mouse.wheel(0,100); await page.waitForTimeout(80); }
  await page.waitForTimeout(400);
  const na = await view();
  ok('een kwartslag draaien is één zoomniveau erbij',
     Math.abs(na.zoom-voor.zoom-1)<0.3 || (console.log('zoom:',voor.zoom,'->',na.zoom),false));
  // Er wordt om het kijkgat gezoomd, en dat ligt hier in het midden van het
  // scherm: het middelpunt van de kaart hoort dus te blijven staan.
  ok('en er wordt om de puck gezoomd, niet om iets anders',
     Math.abs(na.lng-voor.lng)<0.002 && Math.abs(na.lat-voor.lat)<0.002
     || (console.log('midden:',voor,'->',na),false));

  // De andere kant op is uitzoomen.
  for(let k=0;k<8;k++){ await page.mouse.wheel(0,-100); await page.waitForTimeout(80); }
  await page.waitForTimeout(400);
  ok('terugdraaien zoomt weer uit',
     Math.abs((await view()).zoom-voor.zoom)<0.3);

  // Duwen naar rechts is naar het oosten reizen.
  const voorDuw = await view();
  await page.mouse.move(cx,cy); await page.mouse.down();
  await page.mouse.move(cx+220,cy,{steps:14}); await page.waitForTimeout(700);
  await page.mouse.up();
  const naDuw = await view();
  ok('de puck naar rechts duwen reist naar het oosten',
     naDuw.lng>voorDuw.lng+0.0005 || (console.log('lng:',voorDuw.lng,'->',naDuw.lng),false));
  ok('en niet naar het noorden of zuiden',
     Math.abs(naDuw.lat-voorDuw.lat)<0.002);

  /* En hij komt vanzelf tot stilstand. Dit is de reden dat het ijkpunt de
     puck achterna komt: zonder dat blijft een puck die scheef blijft liggen
     de kaart wegduwen tot iemand hem terugtrekt. */
  /* Vijf seconden, niet drie. Het ijkpunt komt met een tijdconstante van
     700 ms achter de puck aan, dus 220 px scheefstand is pas na ruim twee
     seconden binnen de dode zone en dan loopt de kaart nog even uit. Op drie
     seconden stond deze controle precies op het randje en sloeg hij om de
     andere keer om. */
  await page.waitForTimeout(5000);
  const rust1 = await view(); await page.waitForTimeout(900);
  const rust2 = await view();
  ok('en de kaart komt vanzelf weer tot stilstand',
     Math.abs(rust2.lng-rust1.lng)<0.0001
     || (console.log('blijft lopen:',rust1.lng,'->',rust2.lng),false));

  ok('geen JS-fouten (draaien en duwen)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx.close();
}

// ── een sprong in de gemeten hoek zoomt de kaart niet weg ──
{
  /* Draaien zoomt, en 90 graden is één zoomniveau. Dat is prettig aan een
     tafel, maar het betekent ook dat elke fout in de gemeten hoek meteen een
     fout in het zoomniveau is: een pootje dat wegvalt of een hand op het glas
     die een beeldje lang het verkeerde vijftal oplevert, en de kaart staat
     ineens vijf niveaus verder uit. Een hand haalt anderhalve slag per
     seconde niet, dus alles wat sneller gaat is meetruis en hoort de kaart
     niet te bereiken. Hier wordt precies dat nagedaan: de puck springt in één
     beeldje 144 graden. */
  const ctx7 = await browser.newContext({ viewport:{width:W,height:H}, hasTouch:true });
  const page = await ctx7.newPage();
  await page.addInitScript(()=>{ try{ localStorage.clear(); localStorage.setItem('pucktable-ui-mode','touch'); }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(BASE+'/index.html?test'); await page.waitForTimeout(900);

  const cdp = await page.context().newCDPSession(page);
  const view = () => page.evaluate(()=>window.__puck.view());
  const pads = deg => page.evaluate(d=>{
    const P=window.__puck, k=P.pxPerMM();
    const r=d*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
    return P.padsFor(P.templates()[1],k)
            .map((p,i)=>({x:Math.round(800+p.x*c-p.y*s), y:Math.round(500+p.x*s+p.y*c), id:i+1}));
  }, deg);

  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:await pads(0)});
  await page.waitForTimeout(600);
  const voor = await view();

  // Rustig draaien mag: twaalf stapjes van 6 graden is samen 72 graden.
  for(let i=1;i<=12;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:await pads(i*6)});
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(300);
  const gedraaid = await view();
  ok('rustig draaien zoomt gewoon',
     Math.abs(gedraaid.zoom-voor.zoom-72/90)<0.3
     || (console.log('zoom:',voor.zoom,'->',gedraaid.zoom),false));

  // En dan een sprong: 144 graden in één beeldje.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:await pads(72+144)});
  await page.waitForTimeout(400);
  const gesprongen = await view();
  ok('een sprong in de hoek verzet het zoomniveau niet',
     Math.abs(gesprongen.zoom-gedraaid.zoom)<0.6
     || (console.log('sprong:',gedraaid.zoom,'->',gesprongen.zoom),false));

  // En daarna doet draaien het nog gewoon: het ijkpunt is meegesprongen, dus
  // de puck bedient de kaart verder alsof er niets gebeurd is.
  const na = await view();
  for(let i=1;i<=12;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:await pads(216+i*6)});
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(300);
  ok('en daarna zoomt draaien nog gewoon',
     Math.abs((await view()).zoom-na.zoom-72/90)<0.3);

  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  ok('geen JS-fouten (hoeksprong)', errs.length===0 || (console.log(errs.slice(0,3)),false));
  await ctx7.close();
}

await browser.close();
server.close();
fs.rmSync(work, { recursive: true, force: true });
console.log(log.join("\n"));
console.log(process.exitCode ? "\nrooktest: er ging iets mis" : "\nrooktest: alles goed");
