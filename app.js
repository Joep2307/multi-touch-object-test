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
  retina:1            // fetch one zoom level deeper and draw it at half size → twice the detail, no upscaling
};
const L = {
  nl:{ good:"Goed", bad:"Probleem", talk:"Discussie", idea:"Idee",
       topics:["Verkeer","Veiligheid","Groen","Geluid","Sociaal","Onderhoud"],
       move:"Kaart vastzetten", locked:"Kaart staat vast", hold:"Stilhouden…", placed:"Vastgelegd",
       noNet:"Geen kaartbeeld — controleer de verbinding. Markeren werkt gewoon door." },
  en:{ good:"Good", bad:"Problem", talk:"Discussion", idea:"Idea",
       topics:["Traffic","Safety","Green","Noise","Social","Upkeep"],
       move:"Freeze map", locked:"Map is frozen", hold:"Hold still…", placed:"Marked",
       noNet:"No map tiles — check the connection. Marking still works." }
};
let lang="nl";
const VERDICTS=[{key:"good",color:"#39d8a4"},{key:"bad",color:"#ff5f56"},
                {key:"talk",color:"#c48cff"},{key:"idea",color:"#ffd166"}];
const vName=k=>L[lang][k], topics=()=>L[lang].topics, vColor=k=>VERDICTS.find(v=>v.key===k).color;
let templates=[
  {id:"puck-01",ratios:[0.62,0.81],verdict:"good"},
  {id:"puck-02",ratios:[0.48,0.76],verdict:"bad"},
  {id:"puck-03",ratios:[0.70,0.93],verdict:"talk"},
  {id:"puck-04",ratios:[0.85,0.90],verdict:"idea"}
];
let simMode=true, debugMode=false, tolerance=0.06, pxPerMM=4, mapLocked=false;
const pins=[];
const el=id=>document.getElementById(id);

/* ═══════════════════════════════════════════════════════════════
   2. MAP — slippy tiles drawn straight onto the canvas.
      No library: Web Mercator is twelve lines of arithmetic.
   ═══════════════════════════════════════════════════════════════ */
const TILE_SETS = {
  dark : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
  osm  : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  none : null
};
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
const tileCache=new Map(); let tilesTried=0, tilesFailed=0;
function getTile(z,x,y){
  const tpl=TILE_SETS[MV.set]; if(!tpl) return null;
  const key=MV.set+"/"+z+"/"+x+"/"+y;
  let img=tileCache.get(key);
  if(!img){
    img=new Image(); img.crossOrigin="anonymous"; img.ok=false;
    img.onload=()=>img.ok=true;
    img.onerror=()=>{ img.bad=true; tilesFailed++; };
    img.src=tpl.replace("{s}","abc"[(x+y)%3]).replace("{z}",z).replace("{x}",x).replace("{y}",y);
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
function blitCovered(z,x,y,rx,ry,rw,rh){
  const img=getTile(z,x,y);
  if(img){ ctx.drawImage(img,rx,ry,rw,rh); return true; }
  for(let d=1;d<=6 && z-d>=0;d++){
    const f=1<<d, a=peekTile(z-d,Math.floor(x/f),Math.floor(y/f));
    if(a){ const s=256/f; ctx.drawImage(a,(x%f)*s,(y%f)*s,s,s,rx,ry,rw,rh); return true; }
  }
  const kids=[peekTile(z+1,x*2,y*2),peekTile(z+1,x*2+1,y*2),
              peekTile(z+1,x*2,y*2+1),peekTile(z+1,x*2+1,y*2+1)];
  if(kids.some(Boolean)){
    const hw=rw/2, hh=rh/2, off=[[0,0],[hw,0],[0,hh],[hw,hh]];
    kids.forEach((k,i)=>{ if(k) ctx.drawImage(k,rx+off[i][0],ry+off[i][1],hw+1,hh+1); });
    return kids.every(Boolean);
  }
  return false;
}
let bgImage=null;   // {img, west, east, north, south} — a map picture pinned to real coordinates
function drawMap(){
  ctx.fillStyle="#0b0e13"; ctx.fillRect(0,0,W,H);
  let drawn=0;

  if(bgImage){
    const nw=MV.project(bgImage.west,bgImage.north), se=MV.project(bgImage.east,bgImage.south);
    ctx.drawImage(bgImage.img, nw.x, nw.y, se.x-nw.x, se.y-nw.y);
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
    if(blitCovered(z,wrapped,ty,rx,ry,rw,rh)) drawn++;
    else if(!bgImage){ ctx.strokeStyle="rgba(28,35,45,.9)"; ctx.lineWidth=1; ctx.strokeRect(rx,ry,rw,rh); }
  }

  if(!drawn && MV.set!=="none"){
    const msg = tilesFailed>0
      ? "Kaartbeeld wordt geblokkeerd. Open dit bestand lokaal in Chrome, niet in een preview-venster."
      : "Kaartbeeld laden…";
    ctx.textAlign="center";
    ctx.fillStyle="rgba(14,18,24,.92)"; ctx.fillRect(W/2-320,22,640,52);
    ctx.strokeStyle="rgba(255,209,102,.4)"; ctx.lineWidth=1; ctx.strokeRect(W/2-320,22,640,52);
    ctx.fillStyle="#ffd166"; ctx.font="13px 'Space Grotesk',system-ui,sans-serif";
    ctx.fillText(msg,W/2,46);
    ctx.fillStyle="rgba(127,139,155,.9)"; ctx.font="11px 'JetBrains Mono',ui-monospace,monospace";
    ctx.fillText(tilesTried+" tegels gevraagd · "+tilesFailed+" mislukt · of sleep een kaartafbeelding hierin",W/2,64);
  }
  // scale bar + attribution
  const mPerPx=156543.03392*Math.cos(MV.lat*Math.PI/180)/Math.pow(2,MV.zoom);
  let barM=Math.pow(10,Math.floor(Math.log10(mPerPx*140)));
  if(barM*2/mPerPx<160) barM*=2;
  const barPx=barM/mPerPx;
  ctx.strokeStyle="rgba(232,237,244,.6)"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(20,H-26); ctx.lineTo(20+barPx,H-26);
  ctx.moveTo(20,H-31); ctx.lineTo(20,H-21); ctx.moveTo(20+barPx,H-31); ctx.lineTo(20+barPx,H-21); ctx.stroke();
  ctx.fillStyle="rgba(232,237,244,.6)"; ctx.font="11px 'JetBrains Mono',ui-monospace,monospace"; ctx.textAlign="left";
  ctx.fillText(barM>=1000?(barM/1000)+" km":barM+" m", 20, H-36);
  ctx.textAlign="center"; ctx.fillStyle="rgba(127,139,155,.75)"; ctx.font="10px 'JetBrains Mono',ui-monospace,monospace";
  ctx.fillText("© OpenStreetMap contributors — openstreetmap.org/copyright"+(MV.set==="osm"?"":" · © CARTO"), W/2, H-10);
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
let gesture=null, mousePan=null;
const mapMovable = () => !mapLocked && !drag && tracks.size===0 && realTouches.size<3;
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
  if(e.pointerType!=="mouse"){
    realTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    peakTouches=Math.max(peakTouches,realTouches.size);
    syncGesture();
  }
});
addEventListener("pointermove",e=>{
  if(e.pointerType==="mouse"||!realTouches.has(e.pointerId)) return;
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
function endPointer(e){ realTouches.delete(e.pointerId); syncGesture(); }
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
let trayDrag=null;
function moveGhost(e){
  if(!trayDrag) return;
  trayDrag.ghost.style.left=(e.clientX-27)+"px";
  trayDrag.ghost.style.top=(e.clientY-27)+"px";
}
function endTrayDrag(e){
  if(!trayDrag) return;
  const {tpl,ghost,node}=trayDrag;
  ghost.remove();
  node.removeEventListener("pointermove",moveGhost);
  node.removeEventListener("pointerup",endTrayDrag);
  node.removeEventListener("pointercancel",endTrayDrag);
  const onPanel=document.elementFromPoint(e.clientX,e.clientY);
  trayDrag=null;
  if(onPanel&&onPanel.closest(".panel")) return;          // dropped back onto a panel — cancel
  if(simPucks.some(s=>s.tpl.id===tpl.id)) return;
  simPucks.push({tpl,x:e.clientX,y:e.clientY,rot:Math.random()*Math.PI*2});
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
  trayDrag={tpl,ghost,node};
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
let drag=null;
addEventListener("mousedown",e=>{
  if(e.target.closest(".panel")||e.target.closest("#sheet")) return;
  const hit=simPucks.slice().reverse().find(s=>Math.hypot(s.x-e.clientX,s.y-e.clientY)<CFG.puckRadiusMM*pxPerMM);
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
  if(mousePan){
    MV.panBy(e.clientX-mousePan.x,e.clientY-mousePan.y);
    mousePan.x=e.clientX; mousePan.y=e.clientY; return;
  }
  if(!drag) return;
  if(drag.rotate) drag.puck.rot=drag.r0+(Math.atan2(e.clientY-drag.puck.y,e.clientX-drag.puck.x)-drag.a0);
  else{ drag.puck.x=e.clientX-drag.ox; drag.puck.y=e.clientY-drag.oy; }
});
addEventListener("mouseup",()=>{ drag=null; mousePan=null; });
addEventListener("wheel",e=>{
  const hit=simPucks.find(s=>Math.hypot(s.x-e.clientX,s.y-e.clientY)<CFG.puckRadiusMM*pxPerMM);
  if(hit){ e.preventDefault(); hit.rot+=e.deltaY*0.002; return; }
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
  pins.push({id:Date.now()+"-"+Math.random().toString(36).slice(2,6),
             lng:+ll.lng.toFixed(6), lat:+ll.lat.toFixed(6),
             verdict:t.tpl.verdict, topic:topics()[topicOf(t.angle)],
             note:"", t:new Date().toISOString()});
  t.armed=false; t.flash=1; t.dwellFrom=performance.now(); save();
}
function save(){ try{ localStorage.setItem("pucktable-"+el("sess").value,JSON.stringify(pins)); }catch(e){} }
function restore(){
  try{ const raw=localStorage.getItem("pucktable-"+el("sess").value);
       if(raw){ const a=JSON.parse(raw); pins.length=0; a.forEach(p=>pins.push(p)); } }catch(e){}
}
let tapStart=null, selected=null;
addEventListener("pointerdown",e=>{
  if(e.target.closest(".panel")) return;
  tapStart={x:e.clientX,y:e.clientY,t:performance.now()};
});
addEventListener("pointerup",e=>{
  if(!tapStart) return;
  const quick=performance.now()-tapStart.t<350 && Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)<12;
  tapStart=null;
  if(!quick||tracks.size) return;
  const hit=[...pins].reverse().find(p=>{
    const s=MV.project(p.lng,p.lat);
    return Math.hypot(s.x-e.clientX,s.y-e.clientY)<24;
  });
  if(hit) openNote(hit,e.clientX,e.clientY); else closeNote();
});
function openNote(pin,x,y){
  selected=pin; const n=el("note");
  n.style.display="block";
  n.style.left=Math.min(innerWidth-280,Math.max(10,x-130))+"px";
  n.style.top=Math.min(innerHeight-160,y+26)+"px";
  el("noteHead").textContent=vName(pin.verdict)+" · "+pin.topic;
  el("noteText").value=pin.note||""; el("noteText").focus();
}
function closeNote(){ el("note").style.display="none"; selected=null; }

/* ═══════════════════════════════════════════════════════════════
   5. FRAME
   ═══════════════════════════════════════════════════════════════ */
const cv=el("c"), ctx=cv.getContext("2d");
let W=0,H=0,lastUI=0;
function resize(){
  const dpr=Math.min(devicePixelRatio||1,3);
  W=innerWidth;H=innerHeight; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingQuality="high";
  pxPerMM=Math.hypot(W,H)/((parseFloat(el("diag").value)||43)*25.4);
}
addEventListener("resize",resize);

function frame(){
  requestAnimationFrame(frame);
  const now=performance.now();
  drawMap();
  if(bakePending){ bakePending=false; bakeMap(); }

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
    if(p.note){ ctx.fillStyle="#07090c"; ctx.font="700 10px 'JetBrains Mono',ui-monospace,monospace"; ctx.textAlign="center";
                ctx.fillText("•",s.x,s.y+3.5); }
    if(selected===p){ ctx.beginPath(); ctx.arc(s.x,s.y,24,0,Math.PI*2);
      ctx.strokeStyle="#e8edf4"; ctx.lineWidth=1.5; ctx.stroke(); }
  }

  for(const t of pucks){
    const c=vColor(t.tpl.verdict), R=CFG.puckRadiusMM*pxPerMM;
    const ti=topicOf(t.angle), list=topics(), n=list.length;
    ctx.save(); ctx.globalAlpha=t.state==="incomplete"?0.35:1;
    for(let k=0;k<n;k++){
      const a0=-Math.PI+(k/n)*Math.PI*2+0.03, a1=-Math.PI+((k+1)/n)*Math.PI*2-0.03;
      ctx.beginPath(); ctx.arc(t.x,t.y,CFG.ringPX,a0,a1);
      ctx.strokeStyle=k===ti?c:c+"33"; ctx.lineWidth=k===ti?7:3; ctx.stroke();
      const am=(a0+a1)/2, lr=CFG.ringPX+20;
      ctx.font=k===ti?"600 13px 'Space Grotesk',system-ui,sans-serif":"12px 'Space Grotesk',system-ui,sans-serif";
      ctx.fillStyle=k===ti?"#e8edf4":"rgba(232,237,244,.4)";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(list[k],t.x+Math.cos(am)*lr,t.y+Math.sin(am)*lr);
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

  el("readoutBody").innerHTML=pucks.length?pucks.map(t=>{
    const c=vColor(t.tpl.verdict);
    return `<div class="puckcard" style="border-color:${c}">
      <div class="name">${vName(t.tpl.verdict)} · ${topics()[topicOf(t.angle)]}</div>
      <div class="data">${t.tpl.id} · ${(t.conf*100).toFixed(0)}% · ${(t.angle*180/Math.PI).toFixed(0)}°<br>
      ${t.armed?"klaar om vast te leggen":"til op en verplaats"}</div></div>`;
  }).join(""):`<p class="empty">Nog niets op tafel. Sleep een puck vanaf de balk links. Draaien doet het onderwerp.</p>`;

  el("recentBody").innerHTML=pins.length?pins.slice(-8).reverse().map(p=>
    `<div class="pin"><i style="background:${vColor(p.verdict)}"></i>
     <div><b>${p.topic}</b>${p.note?" — "+p.note:""}
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

el("ctrlHead").onclick=()=>{const c=el("controls");c.classList.toggle("collapsed");
  el("chev").textContent=c.classList.contains("collapsed")?"SHOW":"HIDE";};
el("btnMove").onclick=()=>{mapLocked=!mapLocked;gesture=null;mousePan=null;applyLock();};
el("btnLang").onclick=e=>{lang=lang==="nl"?"en":"nl";e.target.textContent=lang==="nl"?"EN":"NL";applyLock();renderTray();};
el("btnSim").onclick=e=>{simMode=!simMode;e.target.classList.toggle("on",simMode);};
el("btnDebug").onclick=e=>{debugMode=!debugMode;e.target.classList.toggle("on",debugMode);};
el("btnClear").onclick=()=>{simPucks.length=0;tracks.clear();markTray();};
el("dwell").oninput=e=>{CFG.dwellMS=parseFloat(e.target.value)*1000;el("dwellVal").textContent=(+e.target.value).toFixed(1)+" s";};
el("tol").oninput=e=>{tolerance=parseFloat(e.target.value);el("tolVal").textContent=tolerance.toFixed(3);};
el("diag").oninput=resize;
el("tiles").onchange=e=>{MV.set=e.target.value;tileCache.clear();};
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
el("noteSave").onclick=()=>{ if(selected){selected.note=el("noteText").value.trim();save();} closeNote(); };
el("noteDel").onclick=()=>{ if(selected){const i=pins.indexOf(selected); if(i>=0)pins.splice(i,1); save();} closeNote(); };
el("btnWipe").onclick=()=>{ if(confirm("Alle markeringen van deze sessie wissen?")){pins.length=0;save();} };

function download(name,text,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click();
}
el("btnGeo").onclick=()=>download(el("sess").value+".geojson",JSON.stringify({
  type:"FeatureCollection",
  features:pins.map(p=>({type:"Feature",geometry:{type:"Point",coordinates:[p.lng,p.lat]},
    properties:{verdict:p.verdict,topic:p.topic,note:p.note,time:p.t}}))
},null,2),"application/geo+json");
el("btnCsv").onclick=()=>download(el("sess").value+".csv",
  "lat,lng,verdict,topic,note,time\n"+pins.map(p=>
    [p.lat,p.lng,p.verdict,p.topic,'"'+(p.note||"").replace(/"/g,'""')+'"',p.t].join(",")).join("\n"),"text/csv");

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
el("closeSheet").onclick=()=>el("sheet").style.display="none";

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
  catch(err){ el("bakeHint").innerHTML="<b>Kon het kaartbeeld niet opslaan</b> — de tegels zijn nog niet volledig geladen. Wacht even en probeer opnieuw."; return; }
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

resize(); restore(); restoreBasemap(); applyLock(); renderTray(); frame();
