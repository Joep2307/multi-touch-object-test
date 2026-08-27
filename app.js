import { kg, loadKG, ensureKG, drawKG, drawGaps, kgAt, kgDescribe, onKgChange,
         nearby, formatDistance, buildQuestion, ask,
         fileUrl, knowledgeOf, relevantDocs } from "./kg.js";

/* ═══════════════════════════════════════════════════════════════
   0. FONTS — loaded from CSS, silently falls back to system faces
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const l=document.createElement("link");
  l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(l);
})();

/* ═══════════════════════════════════════════════════════════════
   1. CONFIG
   ═══════════════════════════════════════════════════════════════ */
const CFG = {
  longestSideMM:60, puckRadiusMM:45,
  stableFrames:3, dropoutMS:180, smoothing:4,
  dwellMS:1200, jitterPX:22, rearmPX:70, ringPX:110,
  retina:0            // use the visible zoom level; avoids four times as many tile requests
};
const L = {
  nl:{ good:"Goed", bad:"Probleem", talk:"Discussie", idea:"Idee",
       topics:["Veiligheid","Verkeer","Groen","Afval","Sociaal","Anders"],
       move:"Kaart vastzetten", locked:"Kaart staat vast", hold:"Stilhouden…", placed:"Vastgelegd",
       moveDots:"Dots verplaatsen", movingDots:"Klaar met verplaatsen",
       touchHint:"Sleep met één vinger. Draai met twee vingers om het thema te kiezen, ook na het vastleggen.",
       laptopHint:"Sleep met de muis. Kies het thema met Shift + slepen of het scrollwiel, ook na het vastleggen.",
       noNet:"Geen kaartbeeld — controleer de verbinding. Markeren werkt gewoon door." },
  en:{ good:"Good", bad:"Problem", talk:"Discussion", idea:"Idea",
       topics:["Safety","Traffic","Green","Waste","Social","Other"],
       move:"Freeze map", locked:"Map is frozen", hold:"Hold still…", placed:"Marked",
       moveDots:"Move dots", movingDots:"Finish moving",
       touchHint:"Drag with one finger. Rotate with two fingers to choose a topic, even after marking.",
       laptopHint:"Drag with the mouse. Choose the topic with Shift + drag or the scroll wheel, even after marking.",
       noNet:"No map tiles — check the connection. Marking still works." }
};
let lang="nl";
let uiMode=(()=>{ try{return localStorage.getItem("pucktable-ui-mode");}catch(e){return null;} })();
if(uiMode!=="touch"&&uiMode!=="laptop") uiMode=matchMedia("(pointer:coarse)").matches?"touch":"laptop";
const VERDICTS=[{key:"good",color:"#39d8a4"},{key:"bad",color:"#ff5f56"},
                {key:"talk",color:"#c48cff"},{key:"idea",color:"#ffd166"}];
const vName=k=>L[lang][k], vColor=k=>VERDICTS.find(v=>v.key===k).color;
const topics=()=>(kg.useThemes&&kg.themes.length?kg.themes:L[lang].topics);
let templates=[
  {id:"puck-01",ratios:[0.62,0.81],verdict:"good"},
  {id:"puck-02",ratios:[0.48,0.76],verdict:"bad"},
  {id:"puck-03",ratios:[0.70,0.93],verdict:"talk"},
  {id:"puck-04",ratios:[0.85,0.90],verdict:"idea"}
];
let simMode=true, debugMode=false, tolerance=0.06, pxPerMM=4, mapLocked=false;
let pinMoveMode=false, pinDrag=null;
const pins=[];
const el=id=>document.getElementById(id);

/* ═══════════════════════════════════════════════════════════════
   2. MAP — slippy tiles drawn straight onto the canvas.
      No library: Web Mercator is twelve lines of arithmetic.
   ═══════════════════════════════════════════════════════════════ */
/* Kaartbeelden. Elk beeld is een andere lezing van dezelfde stad: waar het
   groen zit, waar gebouwd is, hoe het verkeer loopt. `max` is het diepste
   zoomniveau dat de bron levert — daarboven vragen we niets meer op en vult
   blitCovered() het gat met een uitvergrote moedertegel, wat er beter uitziet
   dan lege vlakken. `credit` verschijnt onderaan het scherm; de bronnen
   hieronder eisen die vermelding.

   PDOK is van het Kadaster en open; de OSM-varianten draaien op vrijwillig
   betaalde servers, dus dit is prima voor een prototype op één tafel maar
   niet voor iets dat de hele dag door tienduizenden tegels trekt. */
const TILE_SETS = {
  osm      : {url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png", max:19,
              credit:"© OpenStreetMap contributors — openstreetmap.org/copyright"},
  brt      : {url:"https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png", max:19,
              credit:"© Kadaster / PDOK — BRT Achtergrondkaart"},
  brtgrijs : {url:"https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png", max:19,
              credit:"© Kadaster / PDOK — BRT Achtergrondkaart (grijs)"},
  brtpastel: {url:"https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/pastel/EPSG:3857/{z}/{x}/{y}.png", max:19,
              credit:"© Kadaster / PDOK — BRT Achtergrondkaart (pastel)"},
  water    : {url:"https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/water/EPSG:3857/{z}/{x}/{y}.png", max:19,
              credit:"© Kadaster / PDOK — BRT Achtergrondkaart (water)"},
  lucht    : {url:"https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg", max:19,
              credit:"© Kadaster / Beeldmateriaal.nl — luchtfoto 25 cm"},
  groen    : {url:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", max:17,
              credit:"© OpenStreetMap contributors · SRTM · OpenTopoMap (CC-BY-SA)"},
  bebouwing: {url:"https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", max:19,
              credit:"© OpenStreetMap contributors · Humanitarian OSM Team"},
  verkeer  : {url:"https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png", max:18,
              credit:"© OpenStreetMap contributors · CyclOSM"},
  dark     : {url:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png", max:19,
              credit:"© OpenStreetMap contributors · © CARTO"},
  light    : {url:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png", max:19,
              credit:"© OpenStreetMap contributors · © CARTO"},
  none     : null
};
// Bronnen zonder CORS-header kunnen niet met crossOrigin geladen worden en
// blijven dan zwart. We proberen het één keer opnieuw zonder; de tegels
// verschijnen dan wel, maar het canvas raakt "besmet" en offline bewaren
// werkt niet meer voor dat beeld.
const taintedSets=new Set();
const MV = {
  lng:4.7759, lat:51.5866, zoom:14, set:"osm",
  world(){ return 256*Math.pow(2,this.zoom); },
  wx(lng){ return (lng+180)/360*this.world(); },
  wy(lat){ const s=Math.sin(lat*Math.PI/180);
           return (0.5 - Math.log((1+s)/(1-s))/(4*Math.PI))*this.world(); },
  lngAt(x){ return x/this.world()*360-180; },
  latAt(y){ const n=Math.PI-2*Math.PI*y/this.world();
            return 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))); },
  project(lng,lat){ return {x:this.wx(lng)-this.wx(this.lng)+W/2, y:this.wy(lat)-this.wy(this.lat)+H/2}; },
  unproject(x,y){ return {lng:this.lngAt(x-W/2+this.wx(this.lng)), lat:this.latAt(y-H/2+this.wy(this.lat))}; },
  panBy(dx,dy){
    const cx=this.wx(this.lng)-dx, cy=this.wy(this.lat)-dy;
    this.lng=this.lngAt(cx); this.lat=Math.max(-85,Math.min(85,this.latAt(cy)));
  },
  zoomBy(dz,ax,ay){
    ax=ax===undefined?W/2:ax; ay=ay===undefined?H/2:ay;
    const z=Math.max(3,Math.min(19,this.zoom+dz));
    if(z===this.zoom) return;
    const anchor=this.unproject(ax,ay);            // geo point under the cursor, at the old zoom
    this.zoom=z;
    const p=this.project(anchor.lng,anchor.lat);   // where that same point lands after zooming
    const cx=this.wx(this.lng)+(p.x-ax), cy=this.wy(this.lat)+(p.y-ay);
    this.lng=this.lngAt(cx);
    this.lat=Math.max(-85,Math.min(85,this.latAt(cy)));  // correct the centre in world-pixel space
  }
};
window.MV = MV;   // handy for debugging from the console
const tileCache=new Map(); let tilesTried=0, tilesFailed=0, tileRevision=0, tileRefreshTimer=null;
function tileChanged(){
  if(tileRefreshTimer) return;
  tileRefreshTimer=setTimeout(()=>{tileRevision++;tileRefreshTimer=null;},120);
}
function getTile(z,x,y){
  const set=TILE_SETS[MV.set]; if(!set) return null;
  if(z>set.max) return null;                   // bron gaat niet dieper; parent vullen
  const key=MV.set+"/"+z+"/"+x+"/"+y;
  let img=tileCache.get(key);
  if(!img){
    const src=set.url.replace("{s}","abc"[(x+y)%3])
                     .replace("{z}",z).replace("{x}",x).replace("{y}",y);
    const setName=MV.set, cors=!taintedSets.has(setName);
    img=new Image(); img.ok=false;
    if(cors) img.crossOrigin="anonymous";
    img.onload=()=>{img.ok=true;tileChanged();};
    img.onerror=()=>{
      if(cors && tileCache.get(key)===img){
        // Tweede kans zonder CORS. Een verse Image, want dezelfde src
        // opnieuw zetten haalt de browser niet altijd opnieuw op.
        taintedSets.add(setName);
        const retry=new Image(); retry.ok=false;
        retry.onload=()=>{retry.ok=true;tileChanged();};
        retry.onerror=()=>{retry.bad=true;tilesFailed++;tileChanged();};
        retry.src=src;
        tileCache.set(key,retry);
        return;
      }
      img.bad=true; tilesFailed++; tileChanged();
    };
    img.src=src;
    tileCache.set(key,img); tilesTried++;
    if(tileCache.size>1600){ const k=tileCache.keys().next().value; tileCache.delete(k); }
  }
  return img.ok ? img : null;
}
function peekTile(z,x,y){                      // cache lookup only — never starts a download
  if(z<0) return null;
  const img=tileCache.get(MV.set+"/"+z+"/"+x+"/"+y);
  return img && img.ok ? img : null;
}
/* Draw one tile slot. If its own tile isn't loaded yet, fill the slot from whatever
   is already cached — a patch of a coarser parent tile (zoom-in) or the four finer
   child tiles (zoom-out) — so the map never flashes empty while zooming. */
function blitCovered(g,z,x,y,rx,ry,rw,rh){
  const img=getTile(z,x,y);
  if(img){ g.drawImage(img,rx,ry,rw,rh); return true; }
  for(let d=1;d<=6 && z-d>=0;d++){
    const f=1<<d, a=peekTile(z-d,Math.floor(x/f),Math.floor(y/f));
    if(a){ const s=256/f; g.drawImage(a,(x%f)*s,(y%f)*s,s,s,rx,ry,rw,rh); return true; }
  }
  const kids=[peekTile(z+1,x*2,y*2),peekTile(z+1,x*2+1,y*2),
              peekTile(z+1,x*2,y*2+1),peekTile(z+1,x*2+1,y*2+1)];
  if(kids.some(Boolean)){
    const hw=rw/2, hh=rh/2, off=[[0,0],[hw,0],[0,hh],[hw,hh]];
    kids.forEach((k,i)=>{ if(k) g.drawImage(k,rx+off[i][0],ry+off[i][1],hw+1,hh+1); });
    return kids.every(Boolean);
  }
  return false;
}
let bgImage=null;   // {img, west, east, north, south} — a map picture pinned to real coordinates
function drawMap(g){
  g.fillStyle="#0b0e13"; g.fillRect(0,0,W,H);
  let drawn=0;

  if(bgImage){
    const nw=MV.project(bgImage.west,bgImage.north), se=MV.project(bgImage.east,bgImage.south);
    g.drawImage(bgImage.img, nw.x, nw.y, se.x-nw.x, se.y-nw.y);
    drawn=1;
  }

  const z=Math.max(0,Math.min(19,Math.round(MV.zoom)+CFG.retina));
  const scale=Math.pow(2,MV.zoom-z), ts=256*scale, n=Math.pow(2,z);
  const ox=MV.wx(MV.lng)-W/2, oy=MV.wy(MV.lat)-H/2;
  const x0=Math.floor(ox/ts), x1=Math.floor((ox+W)/ts);
  const y0=Math.max(0,Math.floor(oy/ts)), y1=Math.min(n-1,Math.floor((oy+H)/ts));
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const wrapped=((tx%n)+n)%n;
    // snap every edge to a whole pixel so neighbouring tiles butt together with no seam and no half-pixel blur
    const rx=Math.round(tx*ts-ox), ry=Math.round(ty*ts-oy);
    const rw=Math.round((tx+1)*ts-ox)-rx, rh=Math.round((ty+1)*ts-oy)-ry;
    if(blitCovered(g,z,wrapped,ty,rx,ry,rw,rh)) drawn++;
    else if(!bgImage){ g.strokeStyle="rgba(28,35,45,.9)"; g.lineWidth=1; g.strokeRect(rx,ry,rw,rh); }
  }

  if(!drawn && MV.set!=="none"){
    const msg = tilesFailed>0
      ? "Kaartbeeld wordt geblokkeerd. Open dit bestand lokaal in Chrome, niet in een preview-venster."
      : "Kaartbeeld laden…";
    g.textAlign="center";
    g.fillStyle="rgba(14,18,24,.92)"; g.fillRect(W/2-320,22,640,52);
    g.strokeStyle="rgba(255,209,102,.4)"; g.lineWidth=1; g.strokeRect(W/2-320,22,640,52);
    g.fillStyle="#ffd166"; g.font="13px 'Space Grotesk',system-ui,sans-serif";
    g.fillText(msg,W/2,46);
    g.fillStyle="rgba(127,139,155,.9)"; g.font="11px 'JetBrains Mono',ui-monospace,monospace";
    g.fillText(tilesTried+" tegels gevraagd · "+tilesFailed+" mislukt · of sleep een kaartafbeelding hierin",W/2,64);
  }
  // scale bar + attribution
  const mPerPx=156543.03392*Math.cos(MV.lat*Math.PI/180)/Math.pow(2,MV.zoom);
  let barM=Math.pow(10,Math.floor(Math.log10(mPerPx*140)));
  if(barM*2/mPerPx<160) barM*=2;
  const barPx=barM/mPerPx;
  g.strokeStyle="rgba(232,237,244,.6)"; g.lineWidth=2;
  const barX=88;                               // rechts van de kaartlagen-knop
  g.beginPath(); g.moveTo(barX,H-26); g.lineTo(barX+barPx,H-26);
  g.moveTo(barX,H-31); g.lineTo(barX,H-21); g.moveTo(barX+barPx,H-31); g.lineTo(barX+barPx,H-21); g.stroke();
  g.fillStyle="rgba(232,237,244,.6)"; g.font="11px 'JetBrains Mono',ui-monospace,monospace"; g.textAlign="left";
  g.fillText(barM>=1000?(barM/1000)+" km":barM+" m", barX, H-36);
  g.textAlign="center"; g.fillStyle="rgba(127,139,155,.75)"; g.font="10px 'JetBrains Mono',ui-monospace,monospace";
  g.fillText(TILE_SETS[MV.set]?.credit || "", W/2, H-10);
}

/* ═══════════════════════════════════════════════════════════════
   3. PUCK ENGINE
   ═══════════════════════════════════════════════════════════════ */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function padsFor(tpl,Lm){
  const [r1,r2]=tpl.ratios,a=r1*Lm,b=r2*Lm,c=Lm;
  const rx=(c*c+b*b-a*a)/(2*c), ry=Math.sqrt(Math.max(0,b*b-rx*rx));
  const pts=[{x:0,y:0},{x:c,y:0},{x:rx,y:ry}];
  const cx=(pts[0].x+pts[1].x+pts[2].x)/3, cy=(pts[0].y+pts[1].y+pts[2].y)/3;
  return pts.map(p=>({x:p.x-cx,y:p.y-cy}));
}
function describe(p1,p2,p3){
  const e=[{d:dist(p1,p2),a:p1,b:p2,o:p3},{d:dist(p2,p3),a:p2,b:p3,o:p1},
           {d:dist(p3,p1),a:p3,b:p1,o:p2}].sort((x,y)=>x.d-y.d);
  const long=e[2]; if(long.d<1) return null;
  const anchor=long.o; let P=long.a,Q=long.b;
  if(dist(Q,anchor)<dist(P,anchor)){const t=P;P=Q;Q=t;}
  const cross=(Q.x-P.x)*(anchor.y-P.y)-(Q.y-P.y)*(anchor.x-P.x);
  return {ratios:[e[0].d/long.d,e[1].d/long.d],longest:long.d,anchor,
          chir:cross>=0?1:-1,cx:(p1.x+p2.x+p3.x)/3,cy:(p1.y+p2.y+p3.y)/3};
}
const realTouches=new Map(); let peakTouches=0;

/* One finger drags the map, two fingers pinch it. Three or more is a puck,
   and a recognised puck freezes the map so it can't slide out from under it. */
let gesture=null, mousePan=null, puckTouch=null;
const mapMovable = () => !mapLocked && !pinMoveMode && !drag && !puckTouch && tracks.size===0 && realTouches.size<3;

/* Topmost simulated puck under a screen point — a generous, finger-sized hit area. */
function simPuckAt(x,y){
  return simPucks.slice().reverse().find(s=>Math.hypot(s.x-x,s.y-y)<CFG.puckRadiusMM*pxPerMM);
}
function setSimPuckPosition(puck,x,y){
  puck.x=x; puck.y=y;
  const ll=MV.unproject(x,y);
  puck.lng=ll.lng; puck.lat=ll.lat;
}
function pinAt(x,y){
  return [...pins].reverse().find(pin=>{
    const p=MV.project(pin.lng,pin.lat);
    return Math.hypot(p.x-x,p.y-y)<32;
  });
}
function movePinTo(pin,x,y){
  const ll=MV.unproject(x,y);
  pin.lng=+ll.lng.toFixed(6); pin.lat=+ll.lat.toFixed(6);
}
/* Snapshot the puck + finger geometry so the next move can be applied as a delta:
   one finger slides the puck, two fingers twist it (and nudge it by their midpoint). */
function basePuckTouch(){
  const p=[...puckTouch.ptrs.values()];
  puckTouch.baseRot=puckTouch.puck.rot;
  if(p.length===1){
    puckTouch.dx=p[0].x-puckTouch.puck.x; puckTouch.dy=p[0].y-puckTouch.puck.y;
  }else{
    puckTouch.baseAngle=Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
    puckTouch.dx=puckTouch.puck.x-(p[0].x+p[1].x)/2;
    puckTouch.dy=puckTouch.puck.y-(p[0].y+p[1].y)/2;
  }
}
function syncGesture(){
  if(!mapMovable()){ gesture=null; return; }
  const pts=[...realTouches.entries()];
  if(pts.length===1){
    gesture={n:1,id:pts[0][0],x:pts[0][1].x,y:pts[0][1].y};
  }else if(pts.length===2){
    const a=pts[0][1], b=pts[1][1];
    gesture={n:2,ids:[pts[0][0],pts[1][0]],d:Math.hypot(a.x-b.x,a.y-b.y),
             mx:(a.x+b.x)/2,my:(a.y+b.y)/2};
  }else gesture=null;
}
addEventListener("pointerdown",e=>{
  if(e.target.closest(".panel")) return;
  if(e.pointerType==="mouse") return;
  if(pinMoveMode){
    e.preventDefault();
    const pin=pinAt(e.clientX,e.clientY);
    if(pin){
      pinDrag={pin,pointerId:e.pointerId,kind:"touch"};
      document.body.classList.add("dragging-dot"); closeNote();
    }
    gesture=null; return;
  }
  // A finger on a simulated puck grabs it: one finger slides, a second finger twists it
  // to pick a theme. Once grabbed, any further finger joins the twist.
  if(tracks.size===0){
    const onPuck=simPuckAt(e.clientX,e.clientY);
    if((onPuck && (!puckTouch || puckTouch.puck===onPuck)) || (puckTouch && puckTouch.ptrs.size>=1)){
      if(!puckTouch) puckTouch={puck:onPuck,ptrs:new Map()};
      puckTouch.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      basePuckTouch(); gesture=null;
      return;
    }
  }
  realTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  peakTouches=Math.max(peakTouches,realTouches.size);
  syncGesture();
});
addEventListener("pointermove",e=>{
  if(e.pointerType==="mouse") return;
  if(pinDrag&&pinDrag.kind==="touch"&&pinDrag.pointerId===e.pointerId){
    movePinTo(pinDrag.pin,e.clientX,e.clientY); return;
  }
  if(puckTouch && puckTouch.ptrs.has(e.pointerId)){
    puckTouch.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const p=[...puckTouch.ptrs.values()];
    if(p.length===1){
      setSimPuckPosition(puckTouch.puck,p[0].x-puckTouch.dx,p[0].y-puckTouch.dy);
    }else{
      const ang=Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
      puckTouch.puck.rot=puckTouch.baseRot+(ang-puckTouch.baseAngle);
      setSimPuckPosition(puckTouch.puck,
        (p[0].x+p[1].x)/2+puckTouch.dx,
        (p[0].y+p[1].y)/2+puckTouch.dy);
    }
    return;
  }
  if(!realTouches.has(e.pointerId)) return;
  realTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(!gesture||!mapMovable()) return;
  if(gesture.n===1 && realTouches.has(gesture.id)){
    const p=realTouches.get(gesture.id);
    MV.panBy(p.x-gesture.x,p.y-gesture.y);
    gesture.x=p.x; gesture.y=p.y;
  }else if(gesture.n===2 && gesture.ids.every(i=>realTouches.has(i))){
    const a=realTouches.get(gesture.ids[0]), b=realTouches.get(gesture.ids[1]);
    const d=Math.hypot(a.x-b.x,a.y-b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    MV.panBy(mx-gesture.mx,my-gesture.my);
    if(gesture.d>16&&d>16) MV.zoomBy(Math.log2(d/gesture.d),mx,my);
    gesture.d=d; gesture.mx=mx; gesture.my=my;
  }
});
function endPointer(e){
  if(pinDrag&&pinDrag.kind==="touch"&&pinDrag.pointerId===e.pointerId){
    movePinTo(pinDrag.pin,e.clientX,e.clientY); pinDrag=null;
    document.body.classList.remove("dragging-dot"); save(); return;
  }
  if(puckTouch && puckTouch.ptrs.has(e.pointerId)){
    puckTouch.ptrs.delete(e.pointerId);
    if(puckTouch.ptrs.size===0) puckTouch=null; else basePuckTouch();
    return;
  }
  realTouches.delete(e.pointerId); syncGesture();
}
addEventListener("pointerup",endPointer);
addEventListener("pointercancel",endPointer);
addEventListener("contextmenu",e=>e.preventDefault());

const simPucks=[];

/* ── Puck tray: drag a mini-puck off the left bar to drop it on the table ── */
function renderTray(){
  const box=el("trayPucks"); box.innerHTML="";
  templates.forEach(tpl=>{
    const d=document.createElement("div");
    d.className="traypuck"; d.dataset.id=tpl.id;
    d.style.borderColor=vColor(tpl.verdict);
    d.style.color=vColor(tpl.verdict);
    d.textContent=vName(tpl.verdict);
    box.appendChild(d);
  });
  markTray();
}
function markTray(){
  [...document.querySelectorAll(".traypuck")].forEach(d=>
    d.classList.toggle("used",simPucks.some(s=>s.tpl.id===d.dataset.id)));
}
/* Deselecteren: take every puck off the table and forget the live tracks.
   Marks that were already dropped stay on the map — only the selection goes. */
function clearPucks(){
  if(simPucks.length===0 && tracks.size===0) return;
  simPucks.length=0; tracks.clear(); puckTouch=null; drag=null; markTray();
}
let trayDrag=null;
function moveGhost(e){
  if(!trayDrag) return;
  trayDrag.ghost.style.left=(e.clientX-27)+"px";
  trayDrag.ghost.style.top=(e.clientY-27)+"px";
}
function endTrayDrag(e){
  if(!trayDrag) return;
  const {tpl,ghost,node,x0,y0}=trayDrag;
  ghost.remove();
  node.removeEventListener("pointermove",moveGhost);
  node.removeEventListener("pointerup",endTrayDrag);
  node.removeEventListener("pointercancel",endTrayDrag);
  trayDrag=null;
  if(simPucks.some(s=>s.tpl.id===tpl.id)) return;
  if(Math.hypot(e.clientX-x0,e.clientY-y0)<24) return;     // a tap, not a drag — ignore
  // Drop where released; if that's still under a panel, slide it toward the middle
  // until it clears, so the puck actually lands somewhere visible on the table.
  let x=e.clientX, y=e.clientY;
  const panels=[...document.querySelectorAll(".panel")], M=CFG.ringPX+24;
  const buried=()=>panels.some(p=>{const r=p.getBoundingClientRect();
    return x>=r.left-M&&x<=r.right+M&&y>=r.top-M&&y<=r.bottom+M;});
  for(let i=0;i<400 && buried();i++){ x+=(innerWidth/2-x)*0.05; y+=(innerHeight/2-y)*0.05; }
  const ll=MV.unproject(x,y);
  simPucks.push({tpl,x,y,lng:ll.lng,lat:ll.lat,rot:Math.random()*Math.PI*2});
  markTray();
}
el("trayPucks").addEventListener("pointerdown",e=>{
  const node=e.target.closest(".traypuck");
  if(!node||node.classList.contains("used")) return;
  const tpl=templates.find(t=>t.id===node.dataset.id);
  if(!tpl) return;
  e.preventDefault();
  const ghost=node.cloneNode(true);
  ghost.style.cssText="position:fixed;z-index:60;margin:0;pointer-events:none;opacity:.9";
  document.body.appendChild(ghost);
  trayDrag={tpl,ghost,node,x0:e.clientX,y0:e.clientY};
  moveGhost(e);
  node.setPointerCapture(e.pointerId);
  node.addEventListener("pointermove",moveGhost);
  node.addEventListener("pointerup",endTrayDrag);
  node.addEventListener("pointercancel",endTrayDrag);
});

function simPads(){
  const out=[],Lm=CFG.longestSideMM*pxPerMM;
  for(const s of simPucks) for(const p of padsFor(s.tpl,Lm)){
    const c=Math.cos(s.rot),si=Math.sin(s.rot);
    out.push({x:s.x+p.x*c-p.y*si,y:s.y+p.x*si+p.y*c,sim:true});
  }
  return out;
}
/* Simulated pucks are map markers: their physical size stays constant, while
   their screen position follows the same geographic point during pan/zoom.
   Move the matching track by the same delta so a map transform is not mistaken
   for someone moving the puck to create a second contribution. */
function syncSimPucksToMap(){
  for(const s of simPucks){
    if(!Number.isFinite(s.lng)||!Number.isFinite(s.lat)){
      const ll=MV.unproject(s.x,s.y); s.lng=ll.lng; s.lat=ll.lat;
    }
    if(drag?.puck===s||puckTouch?.puck===s) continue;
    const p=MV.project(s.lng,s.lat), dx=p.x-s.x, dy=p.y-s.y;
    if(Math.abs(dx)<0.001&&Math.abs(dy)<0.001) continue;
    s.x=p.x; s.y=p.y;
    const t=tracks.get(s.tpl.id);
    if(t){
      t.x+=dx; t.y+=dy; t.anchorX+=dx; t.anchorY+=dy;
      t.buf=t.buf.map(q=>({x:q.x+dx,y:q.y+dy}));
    }
  }
}
let drag=null;
addEventListener("mousedown",e=>{
  if(e.target.closest(".panel")||e.target.closest("#sheet")) return;
  if(pinMoveMode){
    e.preventDefault();
    const pin=pinAt(e.clientX,e.clientY);
    if(pin){pinDrag={pin,kind:"mouse"};document.body.classList.add("dragging-dot");closeNote();}
    return;
  }
  const hit=simPuckAt(e.clientX,e.clientY);
  e.preventDefault();
  if(!hit){
    if(!mapLocked && tracks.size===0) mousePan={x:e.clientX,y:e.clientY};
    return;
  }
  drag={puck:hit,rotate:(e.button===2||e.shiftKey),ox:e.clientX-hit.x,oy:e.clientY-hit.y,
        r0:hit.rot,a0:Math.atan2(e.clientY-hit.y,e.clientX-hit.x)};
  gesture=null; mousePan=null;
});
addEventListener("mousemove",e=>{
  if(pinDrag&&pinDrag.kind==="mouse"){movePinTo(pinDrag.pin,e.clientX,e.clientY);return;}
  if(mousePan){
    MV.panBy(e.clientX-mousePan.x,e.clientY-mousePan.y);
    mousePan.x=e.clientX; mousePan.y=e.clientY; return;
  }
  if(!drag) return;
  if(drag.rotate) drag.puck.rot=drag.r0+(Math.atan2(e.clientY-drag.puck.y,e.clientX-drag.puck.x)-drag.a0);
  else setSimPuckPosition(drag.puck,e.clientX-drag.ox,e.clientY-drag.oy);
});
addEventListener("mouseup",e=>{
  if(pinDrag&&pinDrag.kind==="mouse"){
    movePinTo(pinDrag.pin,e.clientX,e.clientY); pinDrag=null;
    document.body.classList.remove("dragging-dot"); save();
  }
  drag=null; mousePan=null;
});
addEventListener("wheel",e=>{
  if(pinMoveMode){e.preventDefault();return;}
  const hit=simPuckAt(e.clientX,e.clientY);
  if(hit){ e.preventDefault(); hit.rot+=e.deltaY*0.002; return; }
  if(e.target.closest("#sheet")) return;
  if(!mapLocked && !e.target.closest(".panel")){
    e.preventDefault();
    // normalise the wheel across mice (pixels), trackpads (many small pixels) and Firefox (lines/pages)
    const unit=e.deltaMode===1?16:e.deltaMode===2?H:1;
    const dz=Math.max(-0.6,Math.min(0.6,-e.deltaY*unit/220));
    MV.zoomBy(dz,e.clientX,e.clientY);
  }
},{passive:false});

function recognise(points){
  const cands=[],maxSpan=CFG.longestSideMM*pxPerMM*1.45;
  for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++){
    if(dist(points[i],points[j])>maxSpan) continue;
    for(let k=j+1;k<points.length;k++){
      if(dist(points[i],points[k])>maxSpan||dist(points[j],points[k])>maxSpan) continue;
      const d=describe(points[i],points[j],points[k]); if(!d) continue;
      for(const tpl of templates){
        const err=Math.hypot(d.ratios[0]-tpl.ratios[0],d.ratios[1]-tpl.ratios[1]);
        if(err>tolerance) continue;
        const sizeErr=Math.abs(d.longest-CFG.longestSideMM*pxPerMM)/(CFG.longestSideMM*pxPerMM);
        if(sizeErr>0.35) continue;
        cands.push({tpl,err,idx:[i,j,k],d,conf:Math.max(0,1-err/tolerance*0.7-sizeErr*0.6)});
      }
    }
  }
  cands.sort((a,b)=>a.err-b.err);
  const used=new Set(),taken=new Set(),out=[];
  for(const c of cands){
    if(taken.has(c.tpl.id)||c.idx.some(i=>used.has(i))) continue;
    c.idx.forEach(i=>used.add(i)); taken.add(c.tpl.id);
    out.push({id:c.tpl.id,tpl:c.tpl,conf:c.conf,x:c.d.cx,y:c.d.cy,
              angle:Math.atan2(c.d.anchor.y-c.d.cy,c.d.anchor.x-c.d.cx)});
  }
  return {pucks:out,usedIdx:used};
}
const tracks=new Map();
function track(dets,now){
  for(const d of dets){
    let t=tracks.get(d.id);
    if(!t){ t={id:d.id,tpl:d.tpl,x:d.x,y:d.y,angle:d.angle,frames:0,state:"candidate",buf:[],
               conf:d.conf,dwellFrom:now,anchorX:d.x,anchorY:d.y,armed:true,flash:0}; tracks.set(d.id,t); }
    t.frames++; t.lastSeen=now; t.conf=t.conf*.7+d.conf*.3;
    t.buf.push({x:d.x,y:d.y}); if(t.buf.length>CFG.smoothing) t.buf.shift();
    t.x=t.buf.reduce((s,p)=>s+p.x,0)/t.buf.length;
    t.y=t.buf.reduce((s,p)=>s+p.y,0)/t.buf.length;
    let dl=d.angle-t.angle; while(dl>Math.PI)dl-=Math.PI*2; while(dl<-Math.PI)dl+=Math.PI*2;
    t.angle+=dl*0.35;
    t.state=t.frames>=CFG.stableFrames?"recognised":"candidate";
    const moved=Math.hypot(t.x-t.anchorX,t.y-t.anchorY);
    if(moved>CFG.jitterPX){ t.anchorX=t.x; t.anchorY=t.y; t.dwellFrom=now; }
    if(moved>CFG.rearmPX) t.armed=true;
  }
  const seen=new Set(dets.map(d=>d.id));
  for(const [id,t] of tracks){
    if(seen.has(id)) continue;
    if(now-t.lastSeen>CFG.dropoutMS) tracks.delete(id);
    else if(t.state==="recognised") t.state="incomplete";
    else tracks.delete(id);
  }
  return [...tracks.values()].filter(t=>t.state!=="candidate");
}

/* ═══════════════════════════════════════════════════════════════
   4. PINS
   ═══════════════════════════════════════════════════════════════ */
const topicOf=angle=>{
  const n=topics().length; let a=(angle+Math.PI)/(Math.PI*2); a=(a%1+1)%1;
  return Math.floor(a*n)%n;
};
function dropPin(t){
  const ll=MV.unproject(t.x,t.y);
  const pin={id:Date.now()+"-"+Math.random().toString(36).slice(2,6),
             lng:+ll.lng.toFixed(6), lat:+ll.lat.toFixed(6),
             verdict:t.tpl.verdict, topic:topics()[topicOf(t.angle)],
             title:"", description:"", note:"", t:new Date().toISOString()};
  pins.push(pin);
  // Keep the mark linked to this puck while it remains on the table. Rotating
  // the puck can then correct its topic after the initial dwell/drop as well.
  t.pinId=pin.id;
  t.armed=false; t.flash=1; t.dwellFrom=performance.now(); save();
  openNote(pin,t.x,t.y,true);
}
function syncPlacedPinTopic(t){
  if(!t.pinId) return;
  const pin=pins.find(p=>p.id===t.pinId);
  if(!pin){ t.pinId=null; return; }
  const topic=topics()[topicOf(t.angle)];
  if(pin.topic===topic) return;
  pin.topic=topic;
  save();
  if(selected===pin) el("noteHead").textContent=vName(pin.verdict)+" · "+pin.topic;
}
function save(){ try{ localStorage.setItem("pucktable-"+el("sess").value,JSON.stringify(pins)); }catch(e){} }
function restore(){
  try{ const raw=localStorage.getItem("pucktable-"+el("sess").value);
       if(raw){ const a=JSON.parse(raw); pins.length=0; a.forEach(p=>pins.push(p)); } }catch(e){}
}
let tapStart=null, selected=null;
addEventListener("pointerdown",e=>{
  if(e.target.closest(".panel")||puckTouch||pinMoveMode) return;
  tapStart={x:e.clientX,y:e.clientY,t:performance.now()};
});
addEventListener("pointerup",e=>{
  if(!tapStart) return;
  const quick=performance.now()-tapStart.t<350 && Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)<12;
  tapStart=null;
  if(!quick) return;
  // A tap that lands on a puck (simulated or detected) belongs to that puck.
  const R=CFG.puckRadiusMM*pxPerMM;
  if(simPuckAt(e.clientX,e.clientY)) return;
  if([...tracks.values()].some(t=>Math.hypot(t.x-e.clientX,t.y-e.clientY)<R*1.3)) return;
  const hit=[...pins].reverse().find(p=>{
    const s=MV.project(p.lng,p.lat);
    return Math.hypot(s.x-e.clientX,s.y-e.clientY)<24;
  });
  if(hit){ openNote(hit,e.clientX,e.clientY); closeKgInfo(); return; }
  // Geen eigen markering geraakt? Dan mag de kennisgraaf de tik hebben.
  const node=kgAt(MV,e.clientX,e.clientY);
  if(node){ closeNote(); openKgInfo(node,e.clientX,e.clientY); return; }
  // Leeg stuk tafel: notitie dicht, graafselectie weg, pucks van tafel.
  closeNote(); closeKgInfo(); clearPucks();
});
/* De hoogte van het venster staat niet vooraf vast: eerst komt de lijst met
   nabije documenten binnen, daarna groeit het antwoord token voor token. Dus
   meten en dan pas plaatsen.

   `recentre` scheidt de twee gevallen. Bij openen wordt het venster op de
   markering gecentreerd; groeit het daarna, dan blijft het staan waar het
   staat en schuift het alleen omhoog zodra het anders van het scherm zou
   lopen. Zonder dat onderscheid zou het bij elk binnengekomen woord
   verspringen. */
function positionNote(recentre=true){
  const n=el("note");
  if(n.style.display!=="block") return;
  const y=+n.dataset.anchorY||innerHeight/2;
  const h=n.offsetHeight;
  const max=Math.max(12,innerHeight-h-12);
  const wanted=recentre?y-h/2:(parseFloat(n.style.top)||y-h/2);
  const top=Math.max(12,Math.min(max,wanted));
  n.style.top=top+"px";
  n.style.setProperty("--stem-top",Math.max(20,Math.min(h-20,y-top))+"px");
}
// Eén waarnemer voor de hele levensduur van de pagina: elke hoogtewijziging
// trekt het venster zo nodig terug binnen beeld.
if(typeof ResizeObserver!=="undefined")
  new ResizeObserver(()=>positionNote(false)).observe(el("note"));

function openNote(pin,x,y,fromPuck=false){
  selected=pin; const n=el("note");
  n.style.display="block";
  const width=310;
  const puckReach=fromPuck?CFG.puckRadiusMM*pxPerMM+46:34;
  const opensRight=x+width+puckReach<innerWidth-12;
  const left=opensRight?x+puckReach:x-puckReach-width;
  n.style.left=Math.max(12,Math.min(innerWidth-width-12,left))+"px";
  n.style.setProperty("--stem-width",Math.max(26,puckReach-4)+"px");
  n.style.setProperty("--note-color",vColor(pin.verdict));
  n.style.setProperty("--origin-x",opensRight?"0":"100%");
  n.style.setProperty("--enter-x",opensRight?"-28px":"28px");
  n.dataset.anchorY=String(y);
  positionNote();
  n.classList.toggle("from-left",opensRight);
  n.classList.toggle("from-right",!opensRight);
  n.classList.remove("opening");
  if(fromPuck){ void n.offsetWidth; n.classList.add("opening"); }
  el("noteHead").textContent=vName(pin.verdict)+" · "+pin.topic;
  el("noteTitle").value=pin.title||"";
  el("noteText").value=pin.description||pin.note||"";
  fillNoteKnowledge(pin);
  el("noteTitle").focus();
}

/* ── Wat de kennisgraaf over deze plek weet ──────────────────────────────
   Los van de kaartlaag: het venster laadt de graaf desnoods zelf, ook als
   "Graaf tonen" uit staat. */
/* De losse opvraag van een entiteit valt niet terug op de fixtures: een 404
   op één item betekent volgens het contract "bestaat niet", niet "geen
   backend". Zonder coco-biblio zijn er dus geen citaten, en dat zeggen we
   liever met zoveel woorden dan met een misleidend "niets gevonden". */
const NO_BACKEND="Hiervoor moet coco-biblio draaien — zonder backend zijn er geen letterlijke fragmenten.";
let askAbort=null;
function fillNoteKnowledge(pin){
  askAbort?.abort(); askAbort=null;
  el("noteAnswer").textContent=""; el("noteAnswer").style.display="none";
  el("noteSources").textContent=""; el("noteSources").style.display="none";
  const box=el("noteNearby");
  box.innerHTML='<p class="empty">Kennisgraaf wordt geladen…</p>';
  el("noteMatches").textContent=""; el("noteMatchHead").style.display="none";
  ensureKG(el("kgUrl").value.trim()).then(()=>{
    if(selected!==pin) return;
    renderNearby(pin);
    renderMatches(pin);
  });
}
/* Eén regel in een graaflijst. Labels via textContent, zodat een titel uit
   de graaf nooit als HTML in de pagina belandt. */
function kgRow(label,right,extraClass=""){
  const row=document.createElement("div");
  row.className="kg-near"+(extraClass?" "+extraClass:"");
  const l=document.createElement("span"); l.className="kg-near-label"; l.textContent=label;
  const r=document.createElement("span"); r.className="kg-near-dist mono"; r.textContent=right;
  row.append(l,r);
  return row;
}

/* Tikken op een regel. Een document opent zichzelf; bij een plek halen we op
   wat er létterlijk over geschreven staat en vouwen dat eronder open. */
async function kgReveal(row,node){
  const open=row.nextElementSibling?.classList.contains("kg-quote");
  [...row.parentElement.querySelectorAll(".kg-quote")].forEach(q=>q.remove());
  if(open){ positionNote(false); return; }
  if(node.type==="document"){
    const url=fileUrl(node.id);
    if(url) window.open(url,"_blank","noopener");
    return;
  }
  const box=document.createElement("div");
  box.className="kg-quote"; box.textContent="Zoeken…";
  row.after(box);
  positionNote(false);
  const k=await knowledgeOf(node.id);
  const chunks=(k?.chunks||[]).slice(0,3);
  if(!k){ box.textContent=NO_BACKEND; positionNote(false); return; }
  if(!chunks.length){ box.textContent="Geen letterlijke fragmenten gevonden."; positionNote(false); return; }
  box.textContent="";
  const titleOf=new Map((k.documents||[]).map(d=>[d.id,d.title]));
  for(const c of chunks){
    const q=document.createElement("p");
    q.style.margin="0 0 8px";
    q.textContent="\u201c"+c.excerpt.trim()+"\u201d";
    const src=document.createElement("span");
    src.className="src";
    src.textContent=(titleOf.get(c.doc_id)||c.doc_id)+(c.page?" · p. "+c.page:"");
    q.appendChild(src);
    box.appendChild(q);
  }
  positionNote(false);
}

function renderNearby(pin){
  const box=el("noteNearby");
  box.textContent="";
  if(!kg.loaded){ box.innerHTML='<p class="empty">Kennisgraaf niet bereikbaar.</p>'; return; }
  const near=nearby(pin.lat,pin.lng,{theme:pin.topic,limit:4});
  if(!near.length){ box.innerHTML='<p class="empty">Niets bekend binnen 1,5 km.</p>'; return; }
  for(const r of near){
    const row=kgRow(r.node.label,formatDistance(r.dist),r.match?"match":"");
    row.onclick=()=>kgReveal(row,r.node);
    box.appendChild(row);
  }
  positionNote();
}

/* Zoeken op de bétekenis van wat er gezegd is, los van de afstand. Vandaar
   een eigen lijstje: dit zijn stukken die over het onderwerp gaan, ook als
   ze aan de andere kant van de stad hangen. */
async function renderMatches(pin){
  const box=el("noteMatches"), head=el("noteMatchHead");
  box.textContent=""; head.style.display="none";
  const q=[pin.title,pin.description||pin.note].filter(Boolean).join(" ");
  const docs=await relevantDocs(q);
  if(selected!==pin||!docs.length) return;
  head.style.display="block";
  for(const d of docs){
    const row=kgRow(d.title,d.year?String(d.year):"");
    row.onclick=()=>{ const u=fileUrl(d.id); if(u) window.open(u,"_blank","noopener"); };
    box.appendChild(row);
  }
  positionNote(false);
}
/* Het antwoord komt als markdown terug. Een volledige parser is hier
   overdreven; dit dekt wat er in de praktijk uit komt — koppen, vet,
   cursief, opsommingen — en escapet eerst álles, zodat er geen HTML uit
   het model in de pagina kan belanden. */
function mdToHtml(md){
  const esc=t=>t.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  return esc(md)
    .replace(/^#{1,6}\s*(.+)$/gm,'<b class="kg-h">$1</b>')
    .replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<i>$2</i>")
    .replace(/^\s*[-•]\s+(.+)$/gm,'<span class="kg-li">$1</span>');
}

async function askKnowledge(){
  const pin=selected; if(!pin) return;
  const near=kg.loaded?nearby(pin.lat,pin.lng,{theme:pin.topic,limit:4}):[];
  const out=el("noteAnswer"), src=el("noteSources");
  out.style.display="block"; out.textContent="Denkt na…";
  src.style.display="none"; src.textContent="";
  askAbort?.abort(); askAbort=new AbortController();
  const question=buildQuestion({
    title:pin.title, description:pin.description||pin.note, topic:pin.topic,
    verdictName:vName(pin.verdict),
    place:near[0]?near[0].node.label:`${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`,
    near,
  });
  try{
    await ask(question,{
      signal:askAbort.signal,
      onToken:t=>{ if(selected===pin) out.innerHTML=mdToHtml(t); },
      onSources:list=>{ if(selected!==pin||!list.length) return;
        src.style.display="block";
        src.textContent="Op basis van: "+[...new Set(list.map(s=>s.title))].slice(0,4).join(" · "); },
    });
  }catch(e){
    if(e.name!=="AbortError") out.textContent="Geen antwoord — draait de backend? ("+e.message+")";
  }
}
function closeNote(){
  askAbort?.abort(); askAbort=null;
  const n=el("note"); n.style.display="none"; n.classList.remove("opening"); selected=null;
  if(keyboardTarget===el("noteTitle")||keyboardTarget===el("noteText")) hideKeyboard(true);
}

/* ═══════════════════════════════════════════════════════════════
   5. FRAME
   ═══════════════════════════════════════════════════════════════ */
const cv=el("c"), ctx=cv.getContext("2d");
const mapLayer=document.createElement("canvas"), mapCtx=mapLayer.getContext("2d");
let W=0,H=0,lastUI=0,mapRenderKey="";
function resize(){
  const dpr=Math.min(devicePixelRatio||1,3);
  W=innerWidth;H=innerHeight; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  mapLayer.width=W*dpr; mapLayer.height=H*dpr; mapCtx.setTransform(dpr,0,0,dpr,0,0);
  mapRenderKey="";
  ctx.imageSmoothingQuality="high";
  mapCtx.imageSmoothingQuality="high";
  pxPerMM=Math.hypot(W,H)/((parseFloat(el("diag").value)||43)*25.4);
}
addEventListener("resize",resize);

function paintMapLayer(){
  const bgKey=bgImage?[bgImage.west,bgImage.east,bgImage.north,bgImage.south].join(","):"none";
  const key=[W,H,MV.set,MV.lng.toFixed(7),MV.lat.toFixed(7),MV.zoom.toFixed(5),tileRevision,bgKey].join("|");
  if(key!==mapRenderKey){drawMap(mapCtx);mapRenderKey=key;}
  ctx.drawImage(mapLayer,0,0,mapLayer.width,mapLayer.height,0,0,W,H);
}

function frame(){
  requestAnimationFrame(frame);
  const now=performance.now();
  paintMapLayer();
  if(bakePending){ bakePending=false; bakeMap(); }
  drawGaps(ctx,MV,W,H);
  drawKG(ctx,MV,W,H);

  syncSimPucksToMap();
  const points=[...realTouches.values(),...(simMode?simPads():[])];
  const {pucks:dets,usedIdx}=recognise(points);
  const pucks=track(dets,now);

  for(const p of pins){
    const s=MV.project(p.lng,p.lat);
    if(s.x<-40||s.y<-40||s.x>W+40||s.y>H+40) continue;
    const c=vColor(p.verdict);
    ctx.beginPath(); ctx.arc(s.x,s.y,17,0,Math.PI*2); ctx.fillStyle=c+"22"; ctx.fill();
    ctx.beginPath(); ctx.arc(s.x,s.y,8,0,Math.PI*2); ctx.fillStyle=c; ctx.fill();
    ctx.strokeStyle="rgba(7,9,12,.85)"; ctx.lineWidth=2; ctx.stroke();
    if(pinMoveMode){
      ctx.beginPath(); ctx.arc(s.x,s.y,pinDrag?.pin===p?27:23,0,Math.PI*2);
      ctx.strokeStyle=pinDrag?.pin===p?"#fff":c; ctx.lineWidth=pinDrag?.pin===p?3:2;
      ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
    }
    if(p.title||p.description||p.note){ ctx.fillStyle="#07090c"; ctx.font="700 10px 'JetBrains Mono',ui-monospace,monospace"; ctx.textAlign="center";
                ctx.fillText("•",s.x,s.y+3.5); }
    if(selected===p){ ctx.beginPath(); ctx.arc(s.x,s.y,24,0,Math.PI*2);
      ctx.strokeStyle="#e8edf4"; ctx.lineWidth=1.5; ctx.stroke(); }
  }

  for(const t of pucks){
    const c=vColor(t.tpl.verdict), R=CFG.puckRadiusMM*pxPerMM;
    const ti=topicOf(t.angle), list=topics(), n=list.length;
    syncPlacedPinTopic(t);
    ctx.save(); ctx.globalAlpha=t.state==="incomplete"?0.35:1;
    for(let k=0;k<n;k++){
      const a0=-Math.PI+(k/n)*Math.PI*2+0.03, a1=-Math.PI+((k+1)/n)*Math.PI*2-0.03;
      ctx.beginPath(); ctx.arc(t.x,t.y,CFG.ringPX,a0,a1);
      ctx.strokeStyle=k===ti?c:c+"33"; ctx.lineWidth=k===ti?7:3; ctx.stroke();
      const am=(a0+a1)/2, lr=CFG.ringPX+23;
      const lx=t.x+Math.cos(am)*lr, ly=t.y+Math.sin(am)*lr;
      const selected=k===ti;
      ctx.font=selected?"700 14px 'Space Grotesk',system-ui,sans-serif":"600 13px 'Space Grotesk',system-ui,sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";

      // Keep the topic legible over detailed map tiles. A compact opaque label
      // also makes the active topic much easier to spot from across the table.
      const labelW=Math.ceil(ctx.measureText(list[k]).width)+18;
      const labelH=selected?28:25;
      ctx.beginPath();
      ctx.roundRect(lx-labelW/2,ly-labelH/2,labelW,labelH,labelH/2);
      ctx.fillStyle=selected?"rgba(9,12,17,.98)":"rgba(9,12,17,.88)";
      ctx.fill();
      ctx.strokeStyle=selected?c:"rgba(232,237,244,.28)";
      ctx.lineWidth=selected?2:1;
      ctx.stroke();
      ctx.fillStyle=selected?"#ffffff":"rgba(232,237,244,.9)";
      ctx.fillText(list[k],lx,ly+.5);
    }
    ctx.textBaseline="alphabetic";
    const prog=Math.min(1,(now-t.dwellFrom)/CFG.dwellMS);
    if(t.armed&&t.state==="recognised"){
      if(prog<1){
        ctx.beginPath(); ctx.arc(t.x,t.y,R+9,-Math.PI/2,-Math.PI/2+prog*Math.PI*2);
        ctx.strokeStyle=c; ctx.lineWidth=4; ctx.lineCap="round"; ctx.stroke(); ctx.lineCap="butt";
      } else dropPin(t);
    }
    if(t.flash>0){
      ctx.beginPath(); ctx.arc(t.x,t.y,R+9+(1-t.flash)*60,0,Math.PI*2);
      ctx.strokeStyle=c+Math.floor(t.flash*200).toString(16).padStart(2,"0");
      ctx.lineWidth=3; ctx.stroke(); t.flash-=0.04;
    }
    ctx.fillStyle="rgba(9,12,17,.94)"; ctx.beginPath(); ctx.arc(t.x,t.y,R,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=c; ctx.lineWidth=2; ctx.stroke();
    ctx.textAlign="center"; ctx.fillStyle=c; ctx.font="600 15px 'Space Grotesk',system-ui,sans-serif";
    ctx.fillText(vName(t.tpl.verdict),t.x,t.y-1);
    ctx.font="10px 'JetBrains Mono',ui-monospace,monospace"; ctx.fillStyle="rgba(232,237,244,.55)";
    ctx.fillText(t.armed?(prog<1?L[lang].hold:""):L[lang].placed,t.x,t.y+14);
    ctx.restore();
  }

  if(debugMode) points.forEach((pt,i)=>{
    ctx.strokeStyle=usedIdx.has(i)?"#39d8a4":"#ffd166"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(pt.x,pt.y,16,0,Math.PI*2); ctx.stroke();
    ctx.font="10px 'JetBrains Mono',ui-monospace,monospace"; ctx.textAlign="left"; ctx.fillStyle=ctx.strokeStyle;
    ctx.fillText((pt.sim?"sim ":"id ")+i,pt.x+20,pt.y+3);
  });

  if(now-lastUI>150){ lastUI=now; updateUI(pucks); }
}

/* ═══════════════════════════════════════════════════════════════
   6. UI
   ═══════════════════════════════════════════════════════════════ */
function updateUI(pucks){
  el("tallyBody").innerHTML=VERDICTS.map(v=>{
    const n=pins.filter(p=>p.verdict===v.key).length;
    return `<div class="tal"><i style="background:${v.color}"></i>${vName(v.key)}<span class="n">${n}</span></div>`;
  }).join("");
  const byTopic={}; pins.forEach(p=>byTopic[p.topic]=(byTopic[p.topic]||0)+1);
  const top=Object.entries(byTopic).sort((a,b)=>b[1]-a[1])[0];
  el("tallyTotal").textContent=pins.length?`${pins.length} markeringen · vaakst: ${top[0]} (${top[1]})`:"nog niets vastgelegd";
  const flag=el("flag");
  if(realTouches.size>=3&&!pucks.length){
    flag.style.display="block";
    flag.textContent="Minder dan 3 contactpunten. Ligt er een puck? Dan koppelen de pads niet — check de aarding.";
  } else flag.style.display="none";

  const safe=s=>String(s||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  el("recentBody").innerHTML=pins.length?pins.slice(-8).reverse().map(p=>
    `<div class="pin"><i style="background:${vColor(p.verdict)}"></i>
     <div><b>${safe(p.title)||(lang==="nl"?"Zonder titel":"Untitled")} - ${safe(p.topic)}</b>
     ${(p.description||p.note)?`<div class="description">${safe(p.description||p.note)}</div>`:""}
     <div class="meta">${vName(p.verdict)} · ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · ${p.t.slice(11,16)}</div></div>
     <span class="del" data-id="${p.id}">✕</span></div>`).join("")
    :`<p class="empty">Leg een puck op een plek en houd hem stil om die plek vast te leggen.</p>`;
  [...document.querySelectorAll(".del")].forEach(b=>b.onclick=()=>{
    const i=pins.findIndex(p=>p.id===b.dataset.id); if(i>=0){pins.splice(i,1);save();}
  });
}
function applyLock(){
  el("btnMove").classList.toggle("on",mapLocked);
  el("btnMove").textContent=mapLocked?L[lang].locked:L[lang].move;
}
function applyPinMoveMode(){
  el("btnMoveDots").classList.toggle("on",pinMoveMode);
  el("btnMoveDots").textContent=pinMoveMode?L[lang].movingDots:L[lang].moveDots;
  document.body.classList.toggle("moving-dots",pinMoveMode);
  if(!pinMoveMode){pinDrag=null;document.body.classList.remove("dragging-dot");}
  gesture=null; mousePan=null;
}

/* Touchscreen keyboard — kept inside the app so a table without an operating-
   system keyboard can still enter titles and descriptions. */
const KEY_ROWS=[
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["shift","z","x","c","v","b","n","m","backspace"],
  ["close",",","space",".","enter"]
];
let keyboardTarget=null, keyboardShift=false;
const keyboardLabel=key=>({shift:"⇧",backspace:"⌫",space:"Spatie",enter:"Enter",close:"Sluiten"})[key]||key;
function renderKeyboard(){
  el("keyboardKeys").innerHTML=KEY_ROWS.map(row=>`<div class="keyboard-row">${row.map(key=>{
    const wide=["shift","backspace","enter","close"].includes(key)?" key-wide":"";
    const space=key==="space"?" key-space":"";
    const active=key==="shift"&&keyboardShift?" key-active":"";
    const label=/^[a-z]$/.test(key)&&keyboardShift?key.toUpperCase():keyboardLabel(key);
    return `<button type="button" class="${wide}${space}${active}" data-key="${key}">${label}</button>`;
  }).join("")}</div>`).join("");
}
function keyboardFields(){
  return [...document.querySelectorAll('input[type="text"],input:not([type]),textarea')];
}
function refreshKeyboardFields(){
  keyboardFields().forEach(field=>{
    field.classList.add("touch-type");
    if(uiMode==="touch") field.setAttribute("inputmode","none");
    else field.removeAttribute("inputmode");
  });
}
function liftEditorAboveKeyboard(){
  const n=el("note"), kb=el("keyboard");
  if(n.style.display!=="block"||!kb.classList.contains("visible")) return;
  const nr=n.getBoundingClientRect(), kr=kb.getBoundingClientRect();
  if(nr.bottom>kr.top-12){
    const top=Math.max(12,kr.top-nr.height-12);
    n.style.top=top+"px";
    const anchorY=Number(n.dataset.anchorY)||top+nr.height/2;
    n.style.setProperty("--stem-top",Math.max(20,Math.min(nr.height-20,anchorY-top))+"px");
  }
}
function showKeyboard(target){
  if(uiMode!=="touch"||!target.classList.contains("touch-type")) return;
  keyboardTarget=target;
  el("keyboardField").textContent=target.labels?.[0]?.textContent||target.placeholder||"Tekst invoeren";
  renderKeyboard();
  el("keyboard").classList.add("visible");
  document.body.classList.add("keyboard-open");
  requestAnimationFrame(liftEditorAboveKeyboard);
  setTimeout(liftEditorAboveKeyboard,360);
}
function hideKeyboard(blur=false){
  el("keyboard").classList.remove("visible");
  document.body.classList.remove("keyboard-open");
  if(blur&&keyboardTarget) keyboardTarget.blur();
  keyboardTarget=null; keyboardShift=false;
}
function insertKeyboardText(text){
  const target=keyboardTarget; if(!target) return;
  const start=target.selectionStart??target.value.length, end=target.selectionEnd??start;
  target.setRangeText(text,start,end,"end");
  target.dispatchEvent(new Event("input",{bubbles:true}));
  target.focus({preventScroll:true});
}
el("keyboard").addEventListener("pointerdown",e=>{if(e.target.closest("button")) e.preventDefault();});
el("keyboard").addEventListener("click",e=>{
  const button=e.target.closest("button[data-key]"); if(!button||!keyboardTarget) return;
  const key=button.dataset.key;
  if(key==="shift"){keyboardShift=!keyboardShift;renderKeyboard();return;}
  if(key==="close"){hideKeyboard(true);return;}
  if(key==="backspace"){
    const target=keyboardTarget, start=target.selectionStart??target.value.length, end=target.selectionEnd??start;
    if(start!==end) target.setRangeText("",start,end,"end");
    else if(start>0) target.setRangeText("",start-1,start,"end");
    target.dispatchEvent(new Event("input",{bubbles:true})); return;
  }
  if(key==="enter"){
    if(keyboardTarget.tagName==="TEXTAREA") insertKeyboardText("\n");
    else if(keyboardTarget===el("noteTitle")){el("noteText").focus();}
    else{
      keyboardTarget.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
      keyboardTarget.dispatchEvent(new Event("change",{bubbles:true}));
      hideKeyboard(true);
    }
    return;
  }
  insertKeyboardText(key==="space"?" ":keyboardShift?key.toUpperCase():key);
  if(keyboardShift){keyboardShift=false;renderKeyboard();}
});
addEventListener("focusin",e=>{if(e.target.classList?.contains("touch-type")) showKeyboard(e.target);});

function applyMode(mode){
  uiMode=mode;
  document.body.classList.toggle("mode-touch",mode==="touch");
  document.body.classList.toggle("mode-laptop",mode==="laptop");
  [["modeTouch","touch"],["modeLaptop","laptop"]].forEach(([id,value])=>{
    const active=value===mode;
    el(id).classList.toggle("active",active);
    el(id).setAttribute("aria-pressed",String(active));
  });
  el("puckHint").textContent=mode==="touch"?L[lang].touchHint:L[lang].laptopHint;
  refreshKeyboardFields();
  if(mode!=="touch") hideKeyboard();
  try{localStorage.setItem("pucktable-ui-mode",mode);}catch(e){}
  resize();
}

el("ctrlHead").onclick=()=>{const c=el("controls");c.classList.toggle("collapsed");
  el("chev").textContent=c.classList.contains("collapsed")?"SHOW":"HIDE";};
el("btnMove").onclick=()=>{mapLocked=!mapLocked;gesture=null;mousePan=null;applyLock();};
el("btnLang").onclick=e=>{lang=lang==="nl"?"en":"nl";e.target.textContent=lang==="nl"?"EN":"NL";applyLock();applyPinMoveMode();applyMode(uiMode);renderTray();};
el("btnMoveDots").onclick=()=>{pinMoveMode=!pinMoveMode;closeNote();applyPinMoveMode();};
el("modeTouch").onclick=()=>applyMode("touch");
el("modeLaptop").onclick=()=>applyMode("laptop");
el("btnSim").onclick=e=>{simMode=!simMode;e.target.classList.toggle("on",simMode);};
el("btnDebug").onclick=e=>{debugMode=!debugMode;e.target.classList.toggle("on",debugMode);};
el("btnClear").onclick=clearPucks;

/* ── Kennisgraaf ───────────────────────────────────────────────── */
function openKgInfo(node,x,y){
  kg.selected=node;
  const n=el("kgInfo");
  n.style.display="block";
  const width=280, height=120;
  n.style.left=Math.max(12,Math.min(innerWidth-width-12,x+26))+"px";
  n.style.top=Math.max(12,Math.min(innerHeight-height-12,y-height/2))+"px";
  el("kgInfoType").textContent=kgDescribe(node);
  el("kgInfoLabel").textContent=node.label;
  const body=el("kgInfoBody"); body.textContent="";
  const rel=(kg.linksOf.get(node.id)||new Set()).size;
  if(rel){
    const p=document.createElement("p");
    p.className="kg-quote"; p.style.borderLeftColor="rgba(122,162,247,.5)";
    p.textContent=rel+" verbinding"+(rel===1?"":"en")+" — de lijnen op de kaart.";
    body.appendChild(p);
  }
  const open=el("kgInfoOpen");
  open.textContent=node.type==="document"?"Document openen":"Wat staat erover";
  open.onclick=()=>{
    if(node.type==="document"){ const u=fileUrl(node.id); if(u) window.open(u,"_blank","noopener"); return; }
    showKgKnowledge(node);
  };
}

/* De letterlijke fragmenten over een plek, in het leesvenster naast het punt. */
async function showKgKnowledge(node){
  const body=el("kgInfoBody");
  body.textContent="Zoeken…";
  const k=await knowledgeOf(node.id);
  if(kg.selected!==node) return;
  const chunks=(k?.chunks||[]).slice(0,3);
  body.textContent="";
  if(!k||!chunks.length){
    const p=document.createElement("p"); p.className="empty";
    p.textContent=k?"Geen letterlijke fragmenten gevonden.":NO_BACKEND;
    body.appendChild(p); return;
  }
  const titleOf=new Map((k.documents||[]).map(d=>[d.id,d.title]));
  for(const c of chunks){
    const q=document.createElement("p");
    q.className="kg-quote";
    q.textContent="\u201c"+c.excerpt.trim()+"\u201d";
    const src=document.createElement("span");
    src.className="src";
    src.textContent=(titleOf.get(c.doc_id)||c.doc_id)+(c.page?" · p. "+c.page:"");
    q.appendChild(src);
    body.appendChild(q);
  }
}
function closeKgInfo(){ kg.selected=null; el("kgInfo").style.display="none"; }
el("kgInfoClose").onclick=closeKgInfo;
async function toggleGaps(){
  kg.gaps=!kg.gaps;
  markLayerMenu();
  if(kg.gaps && !kg.loaded) await ensureKG(el("kgUrl").value.trim());
}
el("noteAsk").onclick=askKnowledge;
onKgChange(()=>{
  el("kgStatus").textContent=kg.status;
  el("btnKg").classList.toggle("on",kg.enabled);
  el("btnKgThemes").classList.toggle("on",kg.useThemes);
});
el("btnKg").onclick=async()=>{
  kg.enabled=!kg.enabled;
  el("btnKg").classList.toggle("on",kg.enabled);
  if(!kg.enabled){ closeKgInfo(); kg.status="uit"; el("kgStatus").textContent=kg.status; return; }
  if(!kg.nodes.length) await loadKG(el("kgUrl").value.trim());
  else el("kgStatus").textContent=kg.status;
};
el("btnKgThemes").onclick=async()=>{
  kg.useThemes=!kg.useThemes;
  el("btnKgThemes").classList.toggle("on",kg.useThemes);
  if(kg.useThemes && !kg.themes.length) await loadKG(el("kgUrl").value.trim());
};
el("kgUrl").onchange=()=>{ kg.nodes.length=0; kg.themes.length=0; if(kg.enabled||kg.useThemes) loadKG(el("kgUrl").value.trim()); };
el("dwell").oninput=e=>{CFG.dwellMS=parseFloat(e.target.value)*1000;el("dwellVal").textContent=(+e.target.value).toFixed(1)+" s";};
el("tol").oninput=e=>{tolerance=parseFloat(e.target.value);el("tolVal").textContent=tolerance.toFixed(3);};
el("diag").oninput=resize;
const BAKE_HINT=el("bakeHint").textContent;
el("tiles").onchange=e=>{
  MV.set=e.target.value; tileCache.clear();
  tilesTried=0; tilesFailed=0;                 // de melding gaat over dít beeld
  el("bakeHint").textContent=BAKE_HINT;
  markLayerMenu();
};

/* ── Kaartlagen-knop linksonder ─────────────────────────────────────────
   Het menu wordt opgebouwd uit de <select> in het bedieningspaneel, zodat
   er één bron van waarheid blijft: een kaartbeeld toevoegen doe je daar in
   de HTML, en het verschijnt hier vanzelf. Klikken zet de select en vuurt
   zijn change af, zodat beide altijd hetzelfde zeggen. */
function layerButton(option){
  const b=document.createElement("button");
  b.type="button"; b.className="layer"; b.dataset.set=option.value;
  b.textContent=option.textContent;
  b.onclick=()=>{
    el("tiles").value=option.value;
    el("tiles").dispatchEvent(new Event("change"));
    closeLayers();
  };
  return b;
}
function buildLayerMenu(){
  const box=el("layersMenu"); box.innerHTML="";

  /* Bovenaan de lagen die óver de kaart heen liggen. Het kaartbeeld eronder
     is een keuze uit één; dit zijn schakelaars, vandaar de scheiding. */
  const overlayHead=document.createElement("p");
  overlayHead.className="eyebrow"; overlayHead.textContent="Lagen";
  box.appendChild(overlayHead);

  const gaps=document.createElement("button");
  gaps.type="button"; gaps.className="layer"; gaps.id="btnGaps";
  gaps.textContent="Documentdichtheid";
  gaps.onclick=toggleGaps;
  box.appendChild(gaps);

  const note=document.createElement("p");
  note.className="hint"; note.style.margin="6px 0 0";
  note.textContent="Warmtekaart over de kennisgraaf: rood waar niets is vastgelegd.";
  box.appendChild(note);

  const mapHead=document.createElement("p");
  mapHead.className="eyebrow"; mapHead.textContent="Kaartbeeld";
  mapHead.style.borderTop="1px solid var(--line)";
  mapHead.style.paddingTop="14px";
  box.appendChild(mapHead);

  for(const child of el("tiles").children){
    if(child.tagName==="OPTGROUP"){
      const h=document.createElement("p");
      h.className="eyebrow"; h.textContent=child.label;
      box.appendChild(h);
      for(const o of child.children) box.appendChild(layerButton(o));
    }else box.appendChild(layerButton(child));
  }
  markLayerMenu();
}
function markLayerMenu(){
  [...el("layersMenu").querySelectorAll(".layer[data-set]")]
    .forEach(b=>b.classList.toggle("on",b.dataset.set===MV.set));
  const g=el("btnGaps");
  if(g){ g.classList.toggle("on",kg.gaps); g.setAttribute("aria-pressed",String(kg.gaps)); }
}
function openLayers(){
  el("layersMenu").style.display="block";
  el("btnLayers").classList.add("on");
  el("btnLayers").setAttribute("aria-expanded","true");
  markLayerMenu();
}
function closeLayers(){
  el("layersMenu").style.display="none";
  el("btnLayers").classList.remove("on");
  el("btnLayers").setAttribute("aria-expanded","false");
}
el("btnLayers").onclick=()=>{
  el("layersMenu").style.display==="block"?closeLayers():openLayers();
};
// Naast het menu tikken sluit het; erin tikken uiteraard niet.
addEventListener("pointerdown",e=>{
  if(el("layersMenu").style.display!=="block") return;
  if(e.target.closest("#layersMenu")||e.target.closest("#btnLayers")) return;
  closeLayers();
});
buildLayerMenu();
el("sess").onchange=restore;
el("zIn").onclick=()=>MV.zoomBy(1);
el("zOut").onclick=()=>MV.zoomBy(-1);
[...document.querySelectorAll("[data-go]")].forEach(b=>b.onclick=()=>{
  const [la,lo,z]=b.dataset.go.split(",").map(Number);
  MV.lat=la; MV.lng=lo; MV.zoom=z;
});
el("search").onkeydown=async e=>{
  if(e.key!=="Enter"||!e.target.value.trim()) return;
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(e.target.value));
    const j=await r.json();
    if(j[0]){ MV.lat=+j[0].lat; MV.lng=+j[0].lon; MV.zoom=15; }
  }catch(err){}
};
el("noteSave").onclick=()=>{ if(selected){ setTimeout(()=>{ if(selected) renderMatches(selected); },0);
  selected.title=el("noteTitle").value.trim();
  selected.description=el("noteText").value.trim();
  selected.note=selected.description; // keep older exports and saved sessions compatible
  save();
} closeNote(); };
el("noteDel").onclick=()=>{ if(selected){const i=pins.indexOf(selected); if(i>=0)pins.splice(i,1); save();} closeNote(); };
el("btnWipe").onclick=()=>{ if(confirm("Alle markeringen van deze sessie wissen?")){pins.length=0;save();} };

function download(name,text,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click();
}
el("btnGeo").onclick=()=>download(el("sess").value+".geojson",JSON.stringify({
  type:"FeatureCollection",
  features:pins.map(p=>({type:"Feature",geometry:{type:"Point",coordinates:[p.lng,p.lat]},
    properties:{verdict:p.verdict,topic:p.topic,title:p.title||"",description:p.description||p.note||"",time:p.t}}))
},null,2),"application/geo+json");
el("btnCsv").onclick=()=>download(el("sess").value+".csv",
  "lat,lng,verdict,topic,title,description,time\n"+pins.map(p=>
    [p.lat,p.lng,p.verdict,p.topic,'"'+(p.title||"").replace(/"/g,'""')+'"',
     '"'+(p.description||p.note||"").replace(/"/g,'""')+'"',p.t].join(",")).join("\n"),"text/csv");

el("btnLearn").onclick=()=>{
  const pts=[...realTouches.values()], hint=el("learnHint");
  if(pts.length!==3){ hint.innerHTML=`Precies <b>3</b> punten nodig, gevonden: <b>${pts.length}</b>. Leg één puck neer en houd hem stil.`; return; }
  const d=describe(pts[0],pts[1],pts[2]);
  const clash=templates.find(t=>Math.hypot(t.ratios[0]-d.ratios[0],t.ratios[1]-d.ratios[1])<0.12);
  const id="puck-"+String(templates.length+1).padStart(2,"0");
  templates.push({id,verdict:VERDICTS[templates.length%VERDICTS.length].key,
                  ratios:[+d.ratios[0].toFixed(3),+d.ratios[1].toFixed(3)]});
  CFG.longestSideMM=d.longest/pxPerMM;
  hint.innerHTML=`<b>${id}</b> toegevoegd — ratio's ${d.ratios[0].toFixed(3)} / ${d.ratios[1].toFixed(3)}, langste zijde ${(d.longest/pxPerMM).toFixed(1)} mm.`+
    (clash?` <b style="color:var(--warn)">Te dicht bij ${clash.id}</b>: maak deze driehoek duidelijk anders.`:"");
  renderTray();
};
el("btnExport").onclick=()=>download("puck-config.json",
  JSON.stringify({longestSideMM:CFG.longestSideMM,tolerance,templates},null,2),"application/json");
el("btnSheet").onclick=()=>{
  el("sheetGrid").innerHTML=templates.map(t=>{
    const pads=padsFor(t,CFG.longestSideMM),S=150,sc=(S*0.34)/CFG.longestSideMM*2;
    const pts=pads.map(p=>({x:S/2+p.x*sc,y:S/2+p.y*sc})),c=vColor(t.verdict);
    return `<div class="sheetcard"><h3 style="color:${c}">${t.id} · ${vName(t.verdict)}</h3>
      <svg width="100%" viewBox="0 0 ${S} ${S}">
        <circle cx="${S/2}" cy="${S/2}" r="${CFG.puckRadiusMM*sc}" fill="none" stroke="#2c3846"/>
        <polygon points="${pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="none" stroke="${c}" stroke-dasharray="3 3"/>
        ${pts.map((p,i)=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${c}"/>
        <text x="${(p.x+9).toFixed(1)}" y="${(p.y+4).toFixed(1)}" font-size="10" font-family="monospace" fill="#7f8b9b">${"ABC"[i]}</text>`).join("")}
      </svg>
      <table>${pads.map((p,i)=>`<tr><td>Pad ${"ABC"[i]}</td><td>x ${p.x.toFixed(1)} mm</td><td>y ${p.y.toFixed(1)} mm</td></tr>`).join("")}
      <tr><td>Ratio's</td><td colspan="2">${t.ratios[0]} / ${t.ratios[1]}</td></tr>
      <tr><td>Langste</td><td colspan="2">${CFG.longestSideMM.toFixed(1)} mm</td></tr></table></div>`;
  }).join("");
  el("sheet").style.display="block";
};
/* Vier manieren om het overzicht te sluiten: de knop onderaan, het kruisje
   bovenin, een tik naast het vel, en Escape. De knop onderaan alleen was te
   weinig — bij vier of meer pucks staat die buiten beeld. */
function closeSheet(){ el("sheet").style.display="none"; }
el("closeSheet").onclick=closeSheet;
el("closeSheetTop").onclick=closeSheet;
el("sheet").addEventListener("pointerdown",e=>{ if(e.target===el("sheet")) closeSheet(); });
addEventListener("keydown",e=>{
  if(e.key!=="Escape") return;
  if(el("sheet").style.display==="block"){ closeSheet(); return; }
  if(el("layersMenu").style.display==="block"){ closeLayers(); return; }
  if(el("note").style.display==="block"){ closeNote(); return; }
  closeKgInfo();
});

/* Drop a map picture (PNG/JPG) to use it as the background. It is pinned to the
   coordinates currently on screen, so panning and zooming still work afterwards. */
addEventListener("dragover",e=>e.preventDefault());
addEventListener("drop",e=>{
  e.preventDefault();
  const f=e.dataTransfer.files&&e.dataTransfer.files[0];
  if(!f||!/^image\//.test(f.type)) return;
  const img=new Image();
  img.onload=()=>{
    const nw=MV.unproject(0,0), se=MV.unproject(W,H);
    bgImage={img,west:nw.lng,north:nw.lat,east:se.lng,south:se.lat};
    MV.set="none"; el("tiles").value="none";
  };
  img.src=URL.createObjectURL(f);
});

/* Save the tiles currently on screen as a picture pinned to their coordinates,
   so the table shows a map even with no connection at all. */
let bakePending=false;
function bakeMap(){
  const nw=MV.unproject(0,0), se=MV.unproject(W,H);
  const scale=Math.min(1,3072/cv.width);
  const off=document.createElement("canvas");
  off.width=Math.round(cv.width*scale); off.height=Math.round(cv.height*scale);
  off.getContext("2d").drawImage(cv,0,0,off.width,off.height);
  let data;
  try{ data=off.toDataURL("image/jpeg",0.9); }
  catch(err){
    el("bakeHint").innerHTML=taintedSets.has(MV.set)
      ? "<b>Dit kaartbeeld kan niet offline bewaard worden</b> — de tegelserver staat het uitlezen van de afbeelding niet toe. Kies OpenStreetMap of een PDOK-beeld en probeer het daarmee."
      : "<b>Kon het kaartbeeld niet opslaan</b> — de tegels zijn nog niet volledig geladen. Wacht even en probeer opnieuw.";
    return;
  }
  const rec={data,west:nw.lng,north:nw.lat,east:se.lng,south:se.lat};
  const img=new Image();
  img.onload=()=>{ bgImage={img,west:rec.west,north:rec.north,east:rec.east,south:rec.south}; };
  img.src=data;
  try{
    localStorage.setItem("pucktable-basemap",JSON.stringify(rec));
    el("bakeHint").innerHTML=`Kaartbeeld bewaard (${Math.round(data.length/1024)} kB). Dit gebied verschijnt nu ook zonder internet.`;
  }catch(err){
    el("bakeHint").innerHTML="Bewaard voor deze sessie, maar te groot voor de browseropslag. Zoom iets verder uit en probeer opnieuw.";
  }
}
function restoreBasemap(){
  try{
    const raw=localStorage.getItem("pucktable-basemap"); if(!raw) return;
    const rec=JSON.parse(raw);
    const img=new Image();
    img.onload=()=>{ bgImage={img,west:rec.west,north:rec.north,east:rec.east,south:rec.south}; };
    img.src=rec.data;
  }catch(e){}
}
el("btnBake").onclick=()=>{ bakePending=true; };
el("btnUnbake").onclick=()=>{
  bgImage=null;
  try{ localStorage.removeItem("pucktable-basemap"); }catch(e){}
  el("bakeHint").textContent="Bewaarde kaart gewist.";
};

resize(); restore(); restoreBasemap(); applyLock(); applyPinMoveMode(); applyMode(uiMode); renderTray(); frame();
