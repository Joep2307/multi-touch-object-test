import { kg, loadKG, ensureKG, drawKG, drawGaps, kgAt, kgDescribe, onKgChange,
         nearby, formatDistance, buildQuestion, ask, setKgLang, kgStatusText,
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
  jitterPX:22, rearmPX:70, ringPX:110,
  retina:0            // use the visible zoom level; avoids four times as many tile requests
};
// De bouwstempel wordt pas onderaan dit bestand ingericht. Vóór die tijd is
// verversen van de taal veilig een no-op (ook bij de eerste paginalaad).
let refreshBuildStamp=()=>{};
/* ── Taal ────────────────────────────────────────────────────────────────
   Eén tabel voor alles wat er op het scherm te lezen valt. De HTML draagt de
   Nederlandse tekst als bron én als terugval; `data-i18n` (en de varianten
   -html, -ph, -aria, -title, -label) koppelt een element aan een sleutel
   hieronder, en applyLang() zet ze in één keer om. Waarden mogen functies
   zijn — dat scheelt losse regels voor meervoud en ingevulde getallen. */
const L = {
  nl:{ good:"Goed", bad:"Probleem", talk:"Discussie", idea:"Idee",
       topics:["Veiligheid","Verkeer","Groen","Afval","Sociaal","Anders"],
       move:"Kaart vastzetten", locked:"Kaart staat vast", placed:"Vastgelegd",
       confirmTouch:"Tik om vast te leggen", confirmMouse:"Klik om vast te leggen",
       moveDots:"Dots verplaatsen", movingDots:"Klaar met verplaatsen",
       touchHint:"Sleep, draai voor het thema, tik om vast te leggen.",
       laptopHint:"Sleep, draai met Shift of het wiel, klik om vast te leggen.",
       flipSide:"Naar de overkant", flipNote:"Naar de overkant",
       noNet:"Geen kaartbeeld — controleer de verbinding. Markeren werkt gewoon door.",

       locale:"nl-NL",
       docTitle:"Puck Table — participatie kaart",
       appTitle:"Participatietafel", mapHead:"Kaart", settings:"Instellingen",
       menu:"Menu", language:"Taal / Language", close:"Sluiten", open:"Openen", document:"Document",
       show:"TOON", hide:"VERBERG",
       touchscreen:"Touchscreen", exportGeo:"GeoJSON exporteren", exportCsv:"CSV exporteren",
       touchDebug:"Touch-debug",

       saidWhat:"Wat is er gezegd", nothingYet:"nog niets vastgelegd",
       tallyTotal:(n,top,c)=>`${n} markeringen · vaakst: ${top} (${c})`,
       groundFlag:"Minder dan 3 contactpunten. Ligt er een puck? Dan koppelen de pads niet — check de aarding.",
       recentMarks:"Laatste markeringen", noMarks:"Nog geen markeringen.",
       untitled:"Zonder titel",

       chooseBasemap:"Kaartbeeld kiezen", chooseControl:"Bediening kiezen",
       controlSize:"Grootte van de bediening",
       smaller:"Bediening kleiner", larger:"Bediening groter",
       scaleHint:"Vensters en knoppen; de kaart blijft op ware grootte.",
       mapControlHead:"Bediening", placesHead:"Ga naar", offlineHead:"Offline kaart",
       rotateControls:"Draai bediening 90 graden", rotateControlsBack:"Zet bediening terug",
       rotateQuarter:"Draai 90 graden",
       orientationHint:"Draait alleen de bediening, vensters en tekst; de kaart blijft staan.",
       twoSides:"Twee zijden",
       sidesHint:"Pucks-balk aan beide kanten; vensters draaien naar wie ze opent.",

       dotsHint:"Zet aan en sleep dan een dot.",
       searchPlace:"Zoek een plek", searchPh:"Breda, Ginneken…",
       allBreda:"Heel Breda", basemap:"Kaartbeeld",
       grpGeneral:"Algemeen", grpTheme:"Thema", grpOther:"Overig",
       tileOsm:"OpenStreetMap", tileBrt:"Topografie — PDOK", tileGrijs:"Grijs — PDOK",
       tilePastel:"Pastel — PDOK", tileGroen:"Groen & hoogte", tileBebouwing:"Bebouwing",
       tileVerkeer:"Verkeer & fiets", tileWater:"Water — PDOK", tileLucht:"Luchtfoto — PDOK",
       tileDark:"Donker (CARTO — API-sleutel nodig)",
       tileLight:"Licht (CARTO — API-sleutel nodig)",
       tileNone:"Geen — alleen raster",
       layersHead:"Lagen", overlaysHead:"Overlays", docDensity:"Documentdichtheid",
       gapsNote:"Rood waar niets is vastgelegd.",
       tileBlocked:"Kaartbeeld wordt geblokkeerd. Open dit bestand lokaal in Chrome, niet in een preview-venster.",
       tileLoading:"Kaartbeeld laden…",
       tilesFoot:(a,f)=>`${a} tegels gevraagd · ${f} mislukt · of sleep een kaartafbeelding hierin`,

       bake:"Kaart offline bewaren", unbake:"Bewaarde kaart wissen",
       bakeHint:"Druk hierop mét internet; daarna werkt dit kaartbeeld ook offline.",
       bakeTainted:"<b>Dit kaartbeeld kan niet offline bewaard worden</b> — de tegelserver staat het uitlezen van de afbeelding niet toe. Kies OpenStreetMap of een PDOK-beeld en probeer het daarmee.",
       bakeFailed:"<b>Kon het kaartbeeld niet opslaan</b> — de tegels zijn nog niet volledig geladen. Wacht even en probeer opnieuw.",
       bakeSaved:(kb)=>`Kaartbeeld bewaard (${kb} kB). Dit gebied verschijnt nu ook zonder internet.`,
       bakeTooBig:"Bewaard voor deze sessie, maar te groot voor de browseropslag. Zoom iets verder uit en probeer opnieuw.",
       bakeCleared:"Bewaarde kaart gewist.",

       kgHead:"Kennisgraaf", kgShow:"Graaf tonen", kgThemes:"Thema's uit graaf",
       kgUrlLabel:"Adres van de backend", kgUrlPh:"leeg = fixtures",
       kgLoading:"Kennisgraaf wordt geladen…", kgUnreachable:"Kennisgraaf niet bereikbaar.",
       nothingWithin:"Niets bekend binnen 1,5 km.",
       noBackend:"Hiervoor moet coco-biblio draaien — zonder backend zijn er geen letterlijke fragmenten.",
       searching:"Zoeken…", noExcerpts:"Geen letterlijke fragmenten gevonden.",
       thinking:"Denkt na…",
       basedOn:(list)=>`Op basis van: ${list}`,
       noAnswer:(m)=>`Geen antwoord — draait de backend? (${m})`,
       conn:(n)=>`${n} verbinding${n===1?"":"en"} — de lijnen op de kaart.`,
       openDoc:"Document openen", whatSaidAbout:"Wat staat erover",

       sessionHead:"Sessie", sessionName:"Naam van de sessie", wipe:"Alles wissen",
       wipeConfirm:"Alle markeringen van deze sessie wissen?",
       analyticsOpen:"Sessie-analyse", analyticsEyebrow:"SESSIE-OVERZICHT", analyticsTitle:"Analyse van de pucks",
       analyticsIntro:(n)=>`${n} vastgelegde ${n===1?"puck":"pucks"} in deze sessie.`,
       analyticsTypes:"Wat is er gelegd?", analyticsTopics:"Welke onderwerpen?", analyticsPlaces:"Waar liggen de pucks?",
       analyticsPlacesNote:"Groepen binnen ongeveer 250 meter. De grootste groepen tonen waar het gesprek zich concentreert.",
       analyticsRelations:"Relaties op dezelfde plek", analyticsRelationsNote:"Onderwerpen die dicht bij elkaar zijn neergelegd, kunnen samen besproken worden.",
       analyticsQuality:"Hoe compleet is de input?", analyticsNoData:"Nog geen pucks vastgelegd.",
       analyticsNotes:(done,total)=>`${done} van ${total} pucks hebben een toelichting`, analyticsLocations:(n)=>`${n} locatie${n===1?"":"s"} met meerdere pucks`,
       analyticsHotspot:"Grootste concentratie", analyticsHotspotShare:(n,p)=>`${n} pucks · ${p}% van alle bijdragen`,
       analyticsNoHotspot:"Nog geen buurt met meerdere pucks.",
       analyticsRelationNone:"Nog geen onderwerpen dicht genoeg bij elkaar.", analyticsAt:"rond",
       simulationHead:"Simulatie", simPuck:"Puck simuleren",
       tolLabel:"Ratio-tolerantie", diagLabel:"Schermdiagonaal (inch)",

       physicalPucks:"Fysieke pucks", learn:"Puck inlezen", sheetBtn:"Bouwtekening",
       exportCfg:"Config exporteren",
       learnHint:"Leg één puck stil op het scherm en druk op <b>Puck inlezen</b>.",
       learnNeed:(n)=>`Precies <b>3</b> punten nodig, gevonden: <b>${n}</b>. Leg één puck neer en houd hem stil.`,
       learnAdded:(id,a,b,mm)=>`<b>${id}</b> toegevoegd — ratio's ${a} / ${b}, langste zijde ${mm} mm.`,
       learnClash:(id)=>` <b style="color:var(--warn)">Te dicht bij ${id}</b>: maak deze driehoek duidelijk anders.`,
       sheetTitle:"Bouwtekening pucks",
       sheetIntro:"Padposities per puck, in millimeters vanaf het midden. Elke driehoek is ongelijkzijdig en de zijdeverhoudingen liggen ver genoeg uit elkaar om ze met een paar millimeter meetfout nog te onderscheiden.",
       sheetPad:"Pad", sheetRatios:"Ratio's", sheetLongest:"Langste",

       deselect:"Deselecteren",
       newNote:"Nieuwe bijdrage", fTitle:"Titel", titlePh:"Geef deze bijdrage een titel",
       fDescription:"Beschrijving", descPh:"Wat is hier aan de hand?",
       del:"Verwijderen", saveBtn:"Bewaren",
       alreadyKnown:"Wat is hier al bekend", aboutWhatYouSay:"Gaat over wat je zegt",
       askSolution:"Vraag om een oplossing",
       onscreenKeyboard:"Schermtoetsenbord", keyboardHead:"Toetsenbord",
       keySpace:"Spatie", keyEnter:"Enter", keyClose:"Sluiten", typeHere:"Tekst invoeren",
       stampUpdated:(d)=>`bijgewerkt ${d}`, stampUnknown:"bijgewerkt onbekend",
       stampLoaded:(t)=>` · geladen ${t}` },

  en:{ good:"Good", bad:"Problem", talk:"Discussion", idea:"Idea",
       topics:["Safety","Traffic","Green","Waste","Social","Other"],
       move:"Freeze map", locked:"Map is frozen", placed:"Marked",
       confirmTouch:"Tap to confirm", confirmMouse:"Click to confirm",
       moveDots:"Move dots", movingDots:"Finish moving",
       touchHint:"Drag, rotate for the topic, tap to confirm.",
       laptopHint:"Drag, rotate with Shift or the wheel, click to confirm.",
       flipSide:"To the other side", flipNote:"To the other side",
       noNet:"No map tiles — check the connection. Marking still works.",

       locale:"en-GB",
       docTitle:"Puck Table — participation map",
       appTitle:"Participation table", mapHead:"Map", settings:"Settings",
       menu:"Menu", language:"Language / Taal", close:"Close", open:"Open", document:"Document",
       show:"SHOW", hide:"HIDE",
       touchscreen:"Touchscreen", exportGeo:"Export GeoJSON", exportCsv:"Export CSV",
       touchDebug:"Touch debug",

       saidWhat:"What was said", nothingYet:"nothing recorded yet",
       tallyTotal:(n,top,c)=>`${n} markings · most often: ${top} (${c})`,
       groundFlag:"Fewer than 3 contact points. Is a puck lying there? Then the pads are not coupling — check the grounding.",
       recentMarks:"Latest markings", noMarks:"No markings yet.",
       untitled:"Untitled",

       chooseBasemap:"Choose map view", chooseControl:"Choose controls",
       controlSize:"Size of the controls",
       smaller:"Smaller controls", larger:"Larger controls",
       scaleHint:"Panels and buttons; the map stays at true size.",
       mapControlHead:"Controls", placesHead:"Go to", offlineHead:"Offline map",
       rotateControls:"Rotate controls 90 degrees", rotateControlsBack:"Reset controls",
       rotateQuarter:"Rotate 90 degrees",
       orientationHint:"Rotates only the controls, panels, and text; the map stays in place.",
       twoSides:"Two sides",
       sidesHint:"Puck bar on both sides; panels turn towards whoever opens them.",

       dotsHint:"Switch on, then drag a dot.",
       searchPlace:"Search for a place", searchPh:"Breda, Ginneken…",
       allBreda:"All of Breda", basemap:"Map view",
       grpGeneral:"General", grpTheme:"Theme", grpOther:"Other",
       tileOsm:"OpenStreetMap", tileBrt:"Topography — PDOK", tileGrijs:"Grey — PDOK",
       tilePastel:"Pastel — PDOK", tileGroen:"Green & elevation", tileBebouwing:"Built-up area",
       tileVerkeer:"Traffic & cycling", tileWater:"Water — PDOK", tileLucht:"Aerial photo — PDOK",
       tileDark:"Dark (CARTO — API key required)",
       tileLight:"Light (CARTO — API key required)",
       tileNone:"None — grid only",
       layersHead:"Layers", overlaysHead:"Overlays", docDensity:"Document density",
       gapsNote:"Red where nothing has been recorded.",
       tileBlocked:"Map tiles are being blocked. Open this file locally in Chrome, not in a preview window.",
       tileLoading:"Loading map tiles…",
       tilesFoot:(a,f)=>`${a} tiles requested · ${f} failed · or drop a map image in here`,

       bake:"Save map offline", unbake:"Clear saved map",
       bakeHint:"Press this while online; after that this map view also works offline.",
       bakeTainted:"<b>This map view cannot be saved offline</b> — the tile server does not allow the image to be read back. Choose OpenStreetMap or a PDOK view and try again with that.",
       bakeFailed:"<b>Could not save the map view</b> — the tiles have not fully loaded yet. Wait a moment and try again.",
       bakeSaved:(kb)=>`Map view saved (${kb} kB). This area now also appears without an internet connection.`,
       bakeTooBig:"Saved for this session, but too large for browser storage. Zoom out a little and try again.",
       bakeCleared:"Saved map cleared.",

       kgHead:"Knowledge graph", kgShow:"Show graph", kgThemes:"Themes from graph",
       kgUrlLabel:"Backend address", kgUrlPh:"empty = fixtures",
       kgLoading:"Loading knowledge graph…", kgUnreachable:"Knowledge graph unreachable.",
       nothingWithin:"Nothing known within 1.5 km.",
       noBackend:"This needs coco-biblio running — without a backend there are no literal excerpts.",
       searching:"Searching…", noExcerpts:"No literal excerpts found.",
       thinking:"Thinking…",
       basedOn:(list)=>`Based on: ${list}`,
       noAnswer:(m)=>`No answer — is the backend running? (${m})`,
       conn:(n)=>`${n} connection${n===1?"":"s"} — the lines on the map.`,
       openDoc:"Open document", whatSaidAbout:"What is written about it",

       sessionHead:"Session", sessionName:"Session name", wipe:"Clear everything",
       wipeConfirm:"Clear all markings from this session?",
       analyticsOpen:"Session analytics", analyticsEyebrow:"SESSION OVERVIEW", analyticsTitle:"Puck analytics",
       analyticsIntro:(n)=>`${n} recorded ${n===1?"puck":"pucks"} in this session.`,
       analyticsTypes:"What was placed?", analyticsTopics:"Which topics?", analyticsPlaces:"Where are the pucks?",
       analyticsPlacesNote:"Groups within about 250 metres. The largest groups show where the conversation is concentrated.",
       analyticsRelations:"Relations at the same place", analyticsRelationsNote:"Topics placed close together can be discussed together.",
       analyticsQuality:"How complete is the input?", analyticsNoData:"No pucks have been recorded yet.",
       analyticsNotes:(done,total)=>`${done} of ${total} pucks have an explanation`, analyticsLocations:(n)=>`${n} location${n===1?"":"s"} with multiple pucks`,
       analyticsHotspot:"Largest concentration", analyticsHotspotShare:(n,p)=>`${n} pucks · ${p}% of all contributions`,
       analyticsNoHotspot:"There is no area with multiple pucks yet.",
       analyticsRelationNone:"No topics are close enough together yet.", analyticsAt:"around",
       simulationHead:"Simulation", simPuck:"Simulate puck",
       tolLabel:"Ratio tolerance", diagLabel:"Screen diagonal (inches)",

       physicalPucks:"Physical pucks", learn:"Read puck", sheetBtn:"Build drawing",
       exportCfg:"Export config",
       learnHint:"Place one puck still on the screen and press <b>Read puck</b>.",
       learnNeed:(n)=>`Exactly <b>3</b> points needed, found: <b>${n}</b>. Put down one puck and hold it still.`,
       learnAdded:(id,a,b,mm)=>`<b>${id}</b> added — ratios ${a} / ${b}, longest side ${mm} mm.`,
       learnClash:(id)=>` <b style="color:var(--warn)">Too close to ${id}</b>: make this triangle clearly different.`,
       sheetTitle:"Puck build drawing",
       sheetIntro:"Pad positions per puck, in millimetres from the centre. Every triangle is scalene and the side ratios lie far enough apart to tell them apart with a few millimetres of measurement error.",
       sheetPad:"Pad", sheetRatios:"Ratios", sheetLongest:"Longest",

       deselect:"Deselect",
       newNote:"New contribution", fTitle:"Title", titlePh:"Give this contribution a title",
       fDescription:"Description", descPh:"What is going on here?",
       del:"Delete", saveBtn:"Save",
       alreadyKnown:"What is already known here", aboutWhatYouSay:"Relates to what you say",
       askSolution:"Ask for a solution",
       onscreenKeyboard:"On-screen keyboard", keyboardHead:"Keyboard",
       keySpace:"Space", keyEnter:"Enter", keyClose:"Close", typeHere:"Enter text",
       stampUpdated:(d)=>`updated ${d}`, stampUnknown:"update time unknown",
       stampLoaded:(t)=>` · loaded ${t}` }
};
/* De keuze blijft bewaard: een tafel die in het Engels stond hoort dat na een
   verversing nog te staan. */
let lang=(()=>{
  try{ const v=localStorage.getItem("pucktable-lang"); if(v==="nl"||v==="en") return v; }catch(e){}
  return "nl";
})();
/* Vertalen. Niet `t` — dat is in dit bestand al de naam van een touch en van
   een puck-sjabloon. Ontbreekt een sleutel in de gekozen taal, dan valt hij
   terug op het Nederlands en anders op de sleutel zelf, zodat een vergeten
   regel zichtbaar wordt in plaats van leeg. */
const tr=(k,...a)=>{
  const v=(L[lang]&&L[lang][k])!==undefined?L[lang][k]:L.nl[k];
  if(v===undefined) return k;
  return typeof v==="function"?v(...a):v;
};
let uiMode=(()=>{ try{return localStorage.getItem("pucktable-ui-mode");}catch(e){return null;} })();
if(uiMode!=="touch"&&uiMode!=="laptop") uiMode=matchMedia("(pointer:coarse)").matches?"touch":"laptop";
/* De bediening kan mee groeien met de tafel: op een 43"-scherm dat een meter
   verderop staat is 100% te klein, op een laptop is 150% belachelijk. Vaste
   trappen in plaats van een schuif, want dit wordt met een vinger bediend.
   `zoom` doet het werk in CSS; hier zit alleen de waarde. Alle plaatsing die
   in JavaScript gebeurt rekent in schermpixels en moet dus door deze factor
   gedeeld worden voordat ze als style.left/top op een venster belandt. */
const UI_SCALES=[0.8,0.9,1,1.15,1.3,1.5,1.75,2];
let uiScale=(()=>{ try{ const v=parseFloat(localStorage.getItem("pucktable-ui-scale"));
                        return UI_SCALES.includes(v)?v:1; }catch(e){ return 1; } })();
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
const storedNorth=(()=>{
  try{ const v=Number(localStorage.getItem("pucktable-north")); return Number.isFinite(v)?v:0; }
  catch(e){ return 0; }
})();
const MV = {
  lng:4.7759, lat:51.5866, zoom:14, set:"osm", north:((storedNorth%360)+360)%360,
  world(){ return 256*Math.pow(2,this.zoom); },
  wx(lng){ return (lng+180)/360*this.world(); },
  wy(lat){ const s=Math.sin(lat*Math.PI/180);
           return (0.5 - Math.log((1+s)/(1-s))/(4*Math.PI))*this.world(); },
  lngAt(x){ return x/this.world()*360-180; },
  latAt(y){ const n=Math.PI-2*Math.PI*y/this.world();
            return 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))); },
  projectRaw(lng,lat){ return {x:this.wx(lng)-this.wx(this.lng)+W/2, y:this.wy(lat)-this.wy(this.lat)+H/2}; },
  rotatePoint(x,y,degrees=this.north){
    const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x-W/2,dy=y-H/2;
    return {x:W/2+dx*c-dy*s,y:H/2+dx*s+dy*c};
  },
  project(lng,lat){ const p=this.projectRaw(lng,lat); return this.rotatePoint(p.x,p.y); },
  unproject(x,y){
    const p=this.rotatePoint(x,y,-this.north);
    return {lng:this.lngAt(p.x-W/2+this.wx(this.lng)), lat:this.latAt(p.y-H/2+this.wy(this.lat))};
  },
  panBy(dx,dy){
    const a=-this.north*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const mapDx=dx*c-dy*s,mapDy=dx*s+dy*c;
    const cx=this.wx(this.lng)-mapDx, cy=this.wy(this.lat)-mapDy;
    this.lng=this.lngAt(cx); this.lat=Math.max(-85,Math.min(85,this.latAt(cy)));
  },
  zoomBy(dz,ax,ay){
    ax=ax===undefined?W/2:ax; ay=ay===undefined?H/2:ay;
    const z=Math.max(3,Math.min(19,this.zoom+dz));
    if(z===this.zoom) return;
    const anchor=this.unproject(ax,ay);            // geo point under the cursor, at the old zoom
    this.zoom=z;
    const p=this.project(anchor.lng,anchor.lat);   // where that same point lands after zooming
    this.panBy(ax-p.x,ay-p.y);                     // keep the anchor fixed, also on a rotated map
  }
};
/* Stel in naar welke schermrand het geografische noorden wijst.
   0° is boven, 90° rechts, 180° onder en 270° links. */
function setNorth(degrees=0){
  const value=Number(degrees);
  if(!Number.isFinite(value)) throw new TypeError("setNorth verwacht een hoek in graden");
  MV.north=((value%360)+360)%360;
  mapRenderKey="";
  try{ localStorage.setItem("pucktable-north",String(MV.north)); }catch(e){}
  dispatchEvent(new CustomEvent("northchange",{detail:{degrees:MV.north}}));
  return MV.north;
}
MV.setNorth=setNorth;
window.setNorth=setNorth;
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
  const rotation=MV.north*Math.PI/180,c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
  const coverW=W*c+H*s,coverH=W*s+H*c;
  g.save();
  g.translate(W/2,H/2); g.rotate(rotation); g.translate(-W/2,-H/2);

  if(bgImage){
    const nw=MV.projectRaw(bgImage.west,bgImage.north), se=MV.projectRaw(bgImage.east,bgImage.south);
    g.drawImage(bgImage.img, nw.x, nw.y, se.x-nw.x, se.y-nw.y);
    drawn=1;
  }

  const z=Math.max(0,Math.min(19,Math.round(MV.zoom)+CFG.retina));
  const scale=Math.pow(2,MV.zoom-z), ts=256*scale, n=Math.pow(2,z);
  const centerX=MV.wx(MV.lng),centerY=MV.wy(MV.lat);
  const x0=Math.floor((centerX-coverW/2)/ts), x1=Math.floor((centerX+coverW/2)/ts);
  const y0=Math.max(0,Math.floor((centerY-coverH/2)/ts)), y1=Math.min(n-1,Math.floor((centerY+coverH/2)/ts));
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const wrapped=((tx%n)+n)%n;
    // snap every edge to a whole pixel so neighbouring tiles butt together with no seam and no half-pixel blur
    const rx=Math.round(tx*ts-centerX+W/2), ry=Math.round(ty*ts-centerY+H/2);
    const rw=Math.round((tx+1)*ts-centerX+W/2)-rx, rh=Math.round((ty+1)*ts-centerY+H/2)-ry;
    if(blitCovered(g,z,wrapped,ty,rx,ry,rw,rh)) drawn++;
    else if(!bgImage){ g.strokeStyle="rgba(28,35,45,.9)"; g.lineWidth=1; g.strokeRect(rx,ry,rw,rh); }
  }
  g.restore();

  if(!drawn && MV.set!=="none"){
    const msg = tilesFailed>0
      ? tr("tileBlocked")
      : tr("tileLoading");
    g.textAlign="center";
    g.fillStyle="rgba(14,18,24,.92)"; g.fillRect(W/2-320,22,640,52);
    g.strokeStyle="rgba(255,209,102,.4)"; g.lineWidth=1; g.strokeRect(W/2-320,22,640,52);
    g.fillStyle="#ffd166"; g.font="13px 'Space Grotesk',system-ui,sans-serif";
    g.fillText(msg,W/2,46);
    g.fillStyle="rgba(127,139,155,.9)"; g.font="11px 'JetBrains Mono',ui-monospace,monospace";
    g.fillText(tr("tilesFoot",tilesTried,tilesFailed),W/2,64);
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
  {
    const onPuck=simPuckAt(e.clientX,e.clientY);
    if((onPuck && (!puckTouch || puckTouch.puck===onPuck)) || (puckTouch && puckTouch.ptrs.size>=1)){
      if(!puckTouch) puckTouch={puck:onPuck,ptrs:new Map(),
                                t0:performance.now(),px:onPuck.x,py:onPuck.y,rot0:onPuck.rot};
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
    if(puckTouch.ptrs.size===0){
      if(wasTap(puckTouch)) tryConfirmPuck(puckTouch.puck.x,puckTouch.puck.y);
      puckTouch=null;
    } else basePuckTouch();
    return;
  }
  realTouches.delete(e.pointerId); syncGesture();
}
addEventListener("pointerup",endPointer);
addEventListener("pointercancel",endPointer);
addEventListener("contextmenu",e=>e.preventDefault());

const simPucks=[];

/* ── Puck tray: drag a mini-puck off the left bar to drop it on the table ── */
/* Eén balk per zijde van de tafel, allemaal met dezelfde inhoud. Vandaar
   klassen in plaats van ids: het aantal balken mag veranderen zonder dat de
   code het hoeft te weten. */
const trays=()=>[...document.querySelectorAll(".tray")];
function renderTray(){
  for(const box of trays()){
    box.innerHTML="";
    templates.forEach(tpl=>{
      const d=document.createElement("div");
      d.className="traypuck"; d.dataset.id=tpl.id;
      d.style.borderColor=vColor(tpl.verdict);
      d.style.color=vColor(tpl.verdict);
      d.textContent=vName(tpl.verdict);
      box.appendChild(d);
    });
  }
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
  trayDrag.ghost.style.left=(e.clientX/uiScale-27)+"px";
  trayDrag.ghost.style.top=(e.clientY/uiScale-27)+"px";
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
  // Alleen panelen die er ook echt liggen: een gesloten menu of venster heeft
  // een lege rect op 0,0 en zou anders de hele linkerbovenhoek blokkeren.
  const panels=[...document.querySelectorAll(".panel")]
    .filter(p=>p.getBoundingClientRect().width>0), M=CFG.ringPX+24;
  const buried=()=>panels.some(p=>{const r=p.getBoundingClientRect();
    return x>=r.left-M&&x<=r.right+M&&y>=r.top-M&&y<=r.bottom+M;});
  for(let i=0;i<400 && buried();i++){ x+=(innerWidth/2-x)*0.05; y+=(innerHeight/2-y)*0.05; }
  const ll=MV.unproject(x,y);
  simPucks.push({tpl,x,y,lng:ll.lng,lat:ll.lat,rot:Math.random()*Math.PI*2});
  markTray();
}
trays().forEach(t=>t.addEventListener("pointerdown",onTrayDown));
function onTrayDown(e){
  const node=e.target.closest(".traypuck");
  if(!node||node.classList.contains("used")) return;
  const tpl=templates.find(t=>t.id===node.dataset.id);
  if(!tpl) return;
  e.preventDefault();
  const ghost=node.cloneNode(true);
  ghost.style.cssText="position:fixed;z-index:60;margin:0;pointer-events:none;opacity:.9;zoom:"+uiScale;
  document.body.appendChild(ghost);
  trayDrag={tpl,ghost,node,x0:e.clientX,y0:e.clientY};
  moveGhost(e);
  node.setPointerCapture(e.pointerId);
  node.addEventListener("pointermove",moveGhost);
  node.addEventListener("pointerup",endTrayDrag);
  node.addEventListener("pointercancel",endTrayDrag);
}

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
        r0:hit.rot,a0:Math.atan2(e.clientY-hit.y,e.clientX-hit.x),
        t0:performance.now(),px:hit.x,py:hit.y,rot0:hit.rot};
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
  if(drag && wasTap(drag)) tryConfirmPuck(drag.puck.x,drag.puck.y);
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
               conf:d.conf,anchorX:d.x,anchorY:d.y,armed:true,flash:0}; tracks.set(d.id,t); }
    t.frames++; t.lastSeen=now; t.conf=t.conf*.7+d.conf*.3;
    t.buf.push({x:d.x,y:d.y}); if(t.buf.length>CFG.smoothing) t.buf.shift();
    t.x=t.buf.reduce((s,p)=>s+p.x,0)/t.buf.length;
    t.y=t.buf.reduce((s,p)=>s+p.y,0)/t.buf.length;
    let dl=d.angle-t.angle; while(dl>Math.PI)dl-=Math.PI*2; while(dl<-Math.PI)dl+=Math.PI*2;
    t.angle+=dl*0.35;
    t.state=t.frames>=CFG.stableFrames?"recognised":"candidate";
    const moved=Math.hypot(t.x-t.anchorX,t.y-t.anchorY);
    if(moved>CFG.jitterPX){ t.anchorX=t.x; t.anchorY=t.y; }
    // Een puck die duidelijk verplaatst wordt, wordt een nieuwe bijdrage: opnieuw
    // een thema draaien en opnieuw bevestigen. De vorige markering blijft staan.
    if(moved>CFG.rearmPX && !t.armed){ t.armed=true; t.pinId=null; }
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
/* Een tik of klik op de puck legt de markering vast. Wat een tik is: kort
   aangeraakt, nauwelijks verschoven en nauwelijks gedraaid — zo blijft slepen
   en draaien gewoon slepen en draaien. */
function wasTap(g){
  return performance.now()-g.t0<400
      && Math.hypot(g.puck.x-g.px,g.puck.y-g.py)<10
      && Math.abs(g.puck.rot-g.rot0)<0.08;
}
function puckTrackAt(x,y){
  const R=CFG.puckRadiusMM*pxPerMM;
  let best=null,bd=Infinity;
  for(const t of tracks.values()){
    if(t.state==="candidate") continue;
    const d=Math.hypot(t.x-x,t.y-y);
    if(d<R*1.3&&d<bd){ bd=d; best=t; }
  }
  return best;
}
function tryConfirmPuck(x,y){
  const t=puckTrackAt(x,y);
  if(!t||!t.armed||t.state!=="recognised") return false;
  dropPin(t);
  return true;
}
function dropPin(t){
  const ll=MV.unproject(t.x,t.y);
  const pin={id:Date.now()+"-"+Math.random().toString(36).slice(2,6),
             lng:+ll.lng.toFixed(6), lat:+ll.lat.toFixed(6),
             verdict:t.tpl.verdict, topic:topics()[topicOf(t.angle)],
             title:"", description:"", note:"", t:new Date().toISOString()};
  pins.push(pin);
  // Keep the mark linked to this puck while it remains on the table. Rotating
  // the puck can then correct its topic after confirming as well.
  t.pinId=pin.id;
  t.armed=false; t.flash=1; save();
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

/* Als de kennisgraaf open staat, krijgt een puck ook een zichtbare relatie
   met wat er op die plek bekend is. De drie best passende knopen houden het
   beeld leesbaar; een thematische overeenkomst is een volle, heldere lijn,
   een puur nabije relatie is subtiel gestreept. */
function drawPuckKnowledgeRelations(ctx,pucks){
  if(!kg.enabled||!kg.loaded||!pucks.length) return;
  const visible=(x,y)=>x>=-24&&y>=-24&&x<=W+24&&y<=H+24;

  ctx.save();
  for(const puck of pucks){
    if(puck.state!=="recognised"&&puck.state!=="incomplete") continue;
    const ll=MV.unproject(puck.x,puck.y);
    const topic=topics()[topicOf(puck.angle)];
    const relations=nearby(ll.lat,ll.lng,{theme:topic,limit:3,radiusM:1200});
    const color=vColor(puck.tpl.verdict);

    for(const relation of relations){
      const target=MV.project(relation.node.lon,relation.node.lat);
      if(!visible(puck.x,puck.y)&&!visible(target.x,target.y)) continue;
      ctx.beginPath(); ctx.moveTo(puck.x,puck.y); ctx.lineTo(target.x,target.y);
      ctx.strokeStyle=relation.match?color+"bb":color+"55";
      ctx.lineWidth=relation.match?2.5:1.25;
      ctx.setLineDash(relation.match?[]:[5,6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Een ring maakt ook bij een drukke kaart meteen duidelijk welk
      // graafpunt bij deze puck hoort, zonder het normale punt te vervangen.
      ctx.beginPath(); ctx.arc(target.x,target.y,relation.match?9:6.5,0,Math.PI*2);
      ctx.strokeStyle=relation.match?color:"rgba(232,237,244,.6)";
      ctx.lineWidth=relation.match?2:1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* De standaarddemo opent niet als een lege kaart. Per soort liggen er drie
   ingevulde bijdragen rond Breda, verspreid over een paar herkenbare plekken. */
const DEMO_PINS=[
  {id:"demo-good-1",lat:51.58918,lng:4.77620,verdict:"good",topic:"Groen",title:"Meer ruimte voor bomen",description:"De extra bomen op de Grote Markt geven schaduw en maken het plein prettiger in de zomer."},
  {id:"demo-good-2",lat:51.58696,lng:4.77963,verdict:"good",topic:"Verkeer",title:"Fijne fietsroute langs de singel",description:"De vrijliggende route voelt veilig en sluit goed aan op het centrum."},
  {id:"demo-good-3",lat:51.58854,lng:4.77091,verdict:"good",topic:"Sociaal",title:"Prettige ontmoetingsplek",description:"Het park wordt door jong en oud gebruikt en nodigt uit om langer te blijven."},

  {id:"demo-bad-1",lat:51.59002,lng:4.77536,verdict:"bad",topic:"Afval",title:"Afval naast de containers",description:"Vooral na het weekend blijven hier zakken en losse verpakkingen liggen."},
  {id:"demo-bad-2",lat:51.58638,lng:4.78102,verdict:"bad",topic:"Veiligheid",title:"Donkere oversteek",description:"De oversteek is in de avond slecht zichtbaar en auto's rijden hier vaak te hard."},
  {id:"demo-bad-3",lat:51.59206,lng:4.77843,verdict:"bad",topic:"Verkeer",title:"Drukke kruising",description:"Fietsers en afslaand verkeer komen hier onduidelijk samen tijdens de spits."},

  {id:"demo-talk-1",lat:51.58897,lng:4.77673,verdict:"talk",topic:"Verkeer",title:"Autoluwe binnenstad",description:"Bespreek hoe bevoorrading mogelijk blijft als er minder doorgaand autoverkeer komt."},
  {id:"demo-talk-2",lat:51.58710,lng:4.77905,verdict:"talk",topic:"Groen",title:"Gebruik van de kade",description:"Kunnen verblijf, evenementen en meer groen hier naast elkaar bestaan?"},
  {id:"demo-talk-3",lat:51.58812,lng:4.77156,verdict:"talk",topic:"Sociaal",title:"Ruimte voor verschillende leeftijden",description:"Bespreek welke voorzieningen zowel kinderen, jongeren als ouderen aanspreken."},

  {id:"demo-idea-1",lat:51.58955,lng:4.77691,verdict:"idea",topic:"Groen",title:"Geveltuinenroute",description:"Maak een aaneengesloten route van geveltuinen en regentonnen door de binnenstad."},
  {id:"demo-idea-2",lat:51.58672,lng:4.78012,verdict:"idea",topic:"Veiligheid",title:"Lichtlijn bij de oversteek",description:"Markeer de looproute met warme, lage verlichting die ook 's avonds goed zichtbaar is."},
  {id:"demo-idea-3",lat:51.59172,lng:4.77784,verdict:"idea",topic:"Afval",title:"Slim inzamelpunt",description:"Plaats een compact inzamelpunt met aparte vakken en een melding wanneer een bak vol is."}
].map((pin,i)=>({...pin,note:pin.description,t:new Date(Date.UTC(2026,7,28,9,15+i*4)).toISOString()}));

function save(){ try{ localStorage.setItem("pucktable-"+el("sess").value,JSON.stringify(pins)); }catch(e){} }
function restore(){
  pins.length=0;
  try{
    const session=el("sess").value;
    const sessionKey="pucktable-"+session;
    const demoKey="pucktable-demo-pins-v1";
    const raw=localStorage.getItem(sessionKey);
    const stored=raw===null?[]:JSON.parse(raw);
    if(Array.isArray(stored)) stored.forEach(p=>pins.push(p));

    /* Ook een sessie-01 die al vóór de demo bestond krijgt de voorbeelden
       één keer toegevoegd. Bestaande bijdragen blijven staan. De aparte
       sleutel voorkomt dat 'Alles wissen' ze bij een herlaadbeurt terugzet. */
    if(session==="sessie-01" && localStorage.getItem(demoKey)!=="1"){
      const ids=new Set(pins.map(p=>p.id));
      DEMO_PINS.filter(p=>!ids.has(p.id)).forEach(p=>pins.push({...p}));
      localStorage.setItem(sessionKey,JSON.stringify(pins));
      localStorage.setItem(demoKey,"1");
    }
  }catch(e){}
}
let tapStart=null, selected=null;
/* Twee tikken kort na elkaar op dezelfde markering. Na een dubbeltik begint de
   telling opnieuw, zodat drie tikken niet als twee dubbeltikken tellen. */
let lastTapId=null, lastTapT=0;
function doubleTap(id){
  const now=performance.now();
  const dbl=id===lastTapId && now-lastTapT<430;
  lastTapId=dbl?null:id; lastTapT=now;
  return dbl;
}
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
  const onTrack=puckTrackAt(e.clientX,e.clientY);
  if(onTrack){
    if(tryConfirmPuck(e.clientX,e.clientY)) return;
    // Een puck die al vast ligt: dubbeltikken zet zijn venster op de andere kant.
    const own=onTrack.pinId?pins.find(p=>p.id===onTrack.pinId):null;
    if(own&&doubleTap(own.id)) flipNote(own,onTrack.x,onTrack.y);
    return;
  }
  const hit=[...pins].reverse().find(p=>{
    const s=MV.project(p.lng,p.lat);
    return Math.hypot(s.x-e.clientX,s.y-e.clientY)<24;
  });
  if(hit){
    closeKgInfo();
    if(doubleTap(hit.id)) flipNote(hit,e.clientX,e.clientY);
    else openNote(hit,e.clientX,e.clientY);
    return;
  }
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
  const s=uiScale;
  const y=+n.dataset.anchorY||innerHeight/2;   // schermpixels
  const h=n.offsetHeight*s;                    // idem: offsetHeight telt ongeschaald
  const max=Math.max(12,innerHeight-h-12);
  const prev=parseFloat(n.style.top);
  const wanted=recentre?y-h/2:(Number.isFinite(prev)?prev*s:y-h/2);
  const top=Math.max(12,Math.min(max,wanted));
  n.style.top=(top/s)+"px";
  setStem(n,h/s,(y-top)/s);
}
// Eén waarnemer voor de hele levensduur van de pagina: elke hoogtewijziging
// trekt het venster zo nodig terug binnen beeld.
if(typeof ResizeObserver!=="undefined")
  new ResizeObserver(()=>positionNote(false)).observe(el("note"));

/* Aan welke kant van de markering het venster opengaat hangt af van waar nog
   ruimte is. Die ruimte verandert zodra de bediening groter of kleiner wordt,
   dus dit staat los van openNote en kan opnieuw gedraaid worden. */
function positionNoteX(){
  const n=el("note");
  if(n.style.display!=="block") return;
  const s=uiScale;
  const x=+n.dataset.anchorX||innerWidth/2;
  const reach=+n.dataset.puckReach||34;
  const width=n.offsetWidth*s;                 // schermpixels
  const opensRight=x+width+reach<innerWidth-12;
  const left=opensRight?x+reach:x-reach-width;
  n.style.left=(Math.max(12,Math.min(innerWidth-width-12,left))/s)+"px";
  n.style.setProperty("--stem-width",Math.max(26,reach/s-4)+"px");
  n.style.setProperty("--origin-x",opensRight?"0":"100%");
  n.style.setProperty("--enter-x",opensRight?"-28px":"28px");
  // In een gedraaid venster wisselt links en rechts van plek, dus de stengel
  // moet aan de andere kant beginnen om nog naar de puck te wijzen.
  const flip=n.classList.contains("flipped");
  n.classList.toggle("from-left",flip?!opensRight:opensRight);
  n.classList.toggle("from-right",flip?opensRight:!opensRight);
}

/* Automatisch opent het venster naar de kant waar de tik vandaan komt, maar
   wie aan de overkant staat kan het overnemen: de knop ⇅ in het venster of een
   dubbeltik op de markering. Die keuze blijft bij de puck (`pin.flip`) tot
   iemand hem terugdraait; zonder keuze geldt weer de automatische regel. */
const flipFor=(pin,y)=>
  sidesActive() && typeof pin?.flip==="boolean" ? pin.flip : flippedFor(y);

/* Van kant wisselen zonder het venster te sluiten: het draait om zijn eigen
   midden, de stengel zoekt de puck weer op en het toetsenbord verhuist mee
   naar de kant waar nu getypt wordt. */
function applyNoteFlip(flip){
  const n=el("note");
  if(n.style.display!=="block") return;
  n.classList.toggle("flipped",flip);
  n.style.setProperty("--flip",flip?"180deg":"0deg");
  positionNoteX();
  positionNote(false);
  const kb=el("keyboard");
  if(kb.classList.contains("visible")&&keyboardTarget&&!keyboardTarget.closest("#menu")){
    kb.classList.toggle("flipped",flip);
    requestAnimationFrame(liftEditorAboveKeyboard);
  }
}
function flipNote(pin=selected,x,y){
  if(!pin||!sidesActive()) return;
  const n=el("note");
  const open=selected===pin&&n.style.display==="block";
  const anchorY=open?(+n.dataset.anchorY||innerHeight/2):(y??innerHeight/2);
  pin.flip=!flipFor(pin,anchorY);
  save();
  if(open) applyNoteFlip(pin.flip);
  else openNote(pin,x??innerWidth/2,y??innerHeight/2,true);
}
/* Wisselt de tafelstand terwijl er een venster open staat, dan hoort dat
   venster mee te draaien in plaats van dicht te gaan. */
function reorientNote(){
  if(selected) applyNoteFlip(flipFor(selected,+el("note").dataset.anchorY||innerHeight/2));
}

function openNote(pin,x,y,fromPuck=false){
  selected=pin; const n=el("note");
  n.style.display="block";
  const flip=flipFor(pin,y);
  n.classList.toggle("flipped",flip);
  n.style.setProperty("--flip",flip?"180deg":"0deg");
  n.style.setProperty("--note-color",vColor(pin.verdict));
  n.dataset.anchorX=String(x);
  n.dataset.anchorY=String(y);
  n.dataset.puckReach=String(fromPuck?CFG.puckRadiusMM*pxPerMM+46:34);
  positionNoteX();
  positionNote();
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
/* Eén regel "hier staat niets" in een lijst. Als element in plaats van als
   HTML-string, zodat vertaalde tekst nooit als opmaak wordt gelezen. */
function emptyLine(text){
  const p=document.createElement("p"); p.className="empty"; p.textContent=text; return p;
}
let askAbort=null;
function fillNoteKnowledge(pin){
  askAbort?.abort(); askAbort=null;
  el("noteAnswer").textContent=""; el("noteAnswer").style.display="none";
  el("noteSources").textContent=""; el("noteSources").style.display="none";
  const box=el("noteNearby");
  box.innerHTML=""; box.appendChild(emptyLine(tr("kgLoading")));
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
    openDocument(node.id,node.label);
    return;
  }
  const box=document.createElement("div");
  box.className="kg-quote"; box.textContent=tr("searching");
  row.after(box);
  positionNote(false);
  const k=await knowledgeOf(node.id);
  const chunks=(k?.chunks||[]).slice(0,3);
  if(!k){ box.textContent=tr("noBackend"); positionNote(false); return; }
  if(!chunks.length){ box.textContent=tr("noExcerpts"); positionNote(false); return; }
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
  if(!kg.loaded){ box.appendChild(emptyLine(tr("kgUnreachable"))); return; }
  const near=nearby(pin.lat,pin.lng,{theme:pin.topic,limit:4});
  if(!near.length){ box.appendChild(emptyLine(tr("nothingWithin"))); return; }
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
    row.onclick=()=>openDocument(d.id,d.title);
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
  out.style.display="block"; out.textContent=tr("thinking");
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
        src.textContent=tr("basedOn",[...new Set(list.map(s=>s.title))].slice(0,4).join(" · ")); },
    });
  }catch(e){
    if(e.name!=="AbortError") out.textContent=tr("noAnswer",e.message);
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
  const key=[W,H,MV.set,MV.lng.toFixed(7),MV.lat.toFixed(7),MV.zoom.toFixed(5),MV.north,tileRevision,bgKey].join("|");
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

  drawPuckKnowledgeRelations(ctx,pucks);

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
    if(t.armed&&t.state==="recognised"){
      const pulse=0.45+0.35*(0.5+0.5*Math.sin(now/380));
      ctx.beginPath(); ctx.arc(t.x,t.y,R+9,0,Math.PI*2);
      ctx.strokeStyle=c+Math.round(pulse*255).toString(16).padStart(2,"0");
      ctx.lineWidth=3; ctx.setLineDash([7,7]); ctx.lineDashOffset=-now/45;
      ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset=0;
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
    ctx.fillText(t.armed?tr(uiMode==="touch"?"confirmTouch":"confirmMouse"):tr("placed"),t.x,t.y+14);
    ctx.restore();
  }

  if(debugMode) points.forEach((pt,i)=>{
    ctx.strokeStyle=usedIdx.has(i)?"#39d8a4":"#ff5f56"; ctx.lineWidth=2;
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
  el("tallyTotal").textContent=pins.length?tr("tallyTotal",pins.length,top[0],top[1]):tr("nothingYet");
  const flag=el("flag");
  if(realTouches.size>=3&&!pucks.length){
    flag.style.display="block";
    flag.textContent=tr("groundFlag");
  } else flag.style.display="none";

  const safe=s=>String(s||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  el("recentBody").innerHTML=pins.length?pins.slice(-8).reverse().map(p=>
    `<div class="pin"><i style="background:${vColor(p.verdict)}"></i>
     <div><b>${safe(p.title)||tr("untitled")} - ${safe(p.topic)}</b>
     ${(p.description||p.note)?`<div class="description">${safe(p.description||p.note)}</div>`:""}
     <div class="meta">${vName(p.verdict)} · ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · ${p.t.slice(11,16)}</div></div>
     <span class="del" data-id="${p.id}">✕</span></div>`).join("")
    :`<p class="empty">${tr("noMarks")}</p>`;
  [...document.querySelectorAll(".del")].forEach(b=>b.onclick=()=>{
    const i=pins.findIndex(p=>p.id===b.dataset.id); if(i>=0){pins.splice(i,1);save();}
  });
  if(el("analytics").classList.contains("open")) renderAnalytics();
}

/* ── Sessie-analyse ────────────────────────────────────────────────────
   De kaart is de plek om bijdragen te maken; dit venster is de plek om ze
   samen te lezen. Groepen worden lokaal berekend uit de opgeslagen punten,
   dus ook een offline sessie krijgt een bruikbaar overzicht. */
const analyticsDistance=(a,b)=>{
  const rad=Math.PI/180, lat=(a.lat+b.lat)/2*rad;
  return Math.hypot((a.lat-b.lat)*111320,(a.lng-b.lng)*111320*Math.cos(lat));
};
function analyticsClusters(){
  const groups=[];
  for(const pin of pins){
    let group=groups.find(g=>analyticsDistance(pin,g.center)<250);
    if(!group){ group={items:[],center:{lat:pin.lat,lng:pin.lng}}; groups.push(group); }
    group.items.push(pin);
    group.center={lat:group.items.reduce((s,p)=>s+p.lat,0)/group.items.length,
                  lng:group.items.reduce((s,p)=>s+p.lng,0)/group.items.length};
  }
  return groups.sort((a,b)=>b.items.length-a.items.length);
}
function analyticsBar(label,count,total,color){
  const row=document.createElement("div"); row.className="analytics-bar";
  const head=document.createElement("div"); head.className="analytics-bar-head";
  const name=document.createElement("span"); name.textContent=label;
  const value=document.createElement("b"); value.textContent=String(count);
  head.append(name,value);
  const rail=document.createElement("div"); rail.className="analytics-rail";
  const fill=document.createElement("i"); fill.style.width=(total?count/total*100:0)+"%"; fill.style.background=color||"var(--accent)";
  rail.appendChild(fill); row.append(head,rail); return row;
}
function renderAnalytics(){
  const total=pins.length;
  el("analyticsIntro").textContent=total?tr("analyticsIntro",total):tr("analyticsNoData");
  const kpis=el("analyticsKpis"); kpis.textContent="";
  const notes=pins.filter(p=>(p.title||p.description||p.note||"").trim()).length;
  const clusters=analyticsClusters(), multi=clusters.filter(g=>g.items.length>1).length;
  const largest=clusters[0]?.items.length||0, largestShare=total?Math.round(largest/total*100):0;
  [[String(total),tr("saidWhat")],[largest>1?largest+"×":"—",largest>1?tr("analyticsHotspot"):tr("analyticsNoHotspot")],
   [total?Math.round(notes/total*100)+"%":"—",tr("analyticsNotes",notes,total)]]
    .forEach(([value,label])=>{ const d=document.createElement("div"); d.className="analytics-kpi"; d.innerHTML=`<b>${value}</b><span>${label}</span>`; kpis.appendChild(d); });

  const types=el("analyticsTypes"), topicsBox=el("analyticsTopics"), places=el("analyticsPlaces"), relations=el("analyticsRelations"), quality=el("analyticsQuality");
  [types,topicsBox,places,relations,quality].forEach(n=>n.textContent="");
  if(!total){ [types,topicsBox,places,relations,quality].forEach(n=>{const p=document.createElement("p");p.className="empty";p.textContent=tr("analyticsNoData");n.appendChild(p);}); return; }
  VERDICTS.forEach(v=>types.appendChild(analyticsBar(vName(v.key),pins.filter(p=>p.verdict===v.key).length,total,v.color)));
  const topicCounts=new Map(); pins.forEach(p=>topicCounts.set(p.topic,(topicCounts.get(p.topic)||0)+1));
  [...topicCounts.entries()].sort((a,b)=>b[1]-a[1]).forEach(([topic,n])=>topicsBox.appendChild(analyticsBar(topic,n,total,"#7aa2f7")));
  const hotspot=clusters.find(g=>g.items.length>1);
  if(hotspot){
    const callout=document.createElement("div"); callout.className="analytics-hotspot";
    callout.innerHTML=`<span>${tr("analyticsHotspot")}</span><b>${tr("analyticsHotspotShare",hotspot.items.length,Math.round(hotspot.items.length/total*100))}</b>`;
    places.appendChild(callout);
  }
  clusters.filter(g=>g.items.length>1).concat(clusters.filter(g=>g.items.length===1)).slice(0,6).forEach((group,i)=>{
    const item=document.createElement("button"); item.className="analytics-place";
    const themes=[...new Set(group.items.map(p=>p.topic))].join(" · ");
    item.innerHTML=`<b>${group.items.length} ${group.items.length===1?"puck":"pucks"}</b><span>${tr("analyticsAt")} ${group.center.lat.toFixed(4)}, ${group.center.lng.toFixed(4)} · ${themes}</span>`;
    item.onclick=()=>{MV.lat=group.center.lat;MV.lng=group.center.lng;MV.zoom=Math.max(MV.zoom,16);closeAnalytics();}; places.appendChild(item);
  });
  const pairs=new Map();
  for(const group of clusters) for(let i=0;i<group.items.length;i++) for(let j=i+1;j<group.items.length;j++){
    const a=group.items[i].topic,b=group.items[j].topic; if(a===b) continue;
    const key=[a,b].sort().join("| "); pairs.set(key,(pairs.get(key)||0)+1);
  }
  if(!pairs.size){ const p=document.createElement("p");p.className="empty";p.textContent=tr("analyticsRelationNone");relations.appendChild(p); }
  else [...pairs.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([pair,n])=>relations.appendChild(analyticsBar(pair.replace("| "," ↔ "),n,Math.max(...pairs.values()),"#c48cff")));
  quality.appendChild(analyticsBar(tr("analyticsNotes",notes,total),notes,total,"#39d8a4"));
  quality.appendChild(analyticsBar(tr("analyticsLocations",multi),multi,Math.max(1,clusters.length),"#ffd166"));
}
let analyticsSide="a";
let analyticsRotation=0;
function applyAnalyticsOrientation(){
  const a=el("analytics");
  a.classList.toggle("at-a",analyticsSide==="a");
  a.classList.toggle("at-b",analyticsSide==="b");
  a.classList.toggle("quarter-turn",analyticsRotation%180!==0);
  a.style.setProperty("--analytics-flip",analyticsRotation+"deg");
  el("flipAnalytics").setAttribute("aria-label",tr("rotateQuarter"));
  el("flipAnalytics").title=tr("rotateQuarter");
}
function openAnalytics(){
  // Bewaar de herkomst voordat closeMenu() die wist: het overzicht hoort bij
  // dezelfde tafelrand te verschijnen en in de leesrichting daarvan te staan.
  analyticsSide=menuSide||"a";
  analyticsRotation=analyticsSide==="b"&&sidesActive()?180:0;
  closeMenu(); closeNote(); renderAnalytics(); applyAnalyticsOrientation();
  const a=el("analytics"); a.classList.add("open");
  el("analytics").scrollTop=0; el("analytics").querySelector(".analytics-inner").scrollTop=0;
}
function flipAnalytics(){
  analyticsRotation=(analyticsRotation+90)%360;
  applyAnalyticsOrientation();
}
function closeAnalytics(){ el("analytics").classList.remove("open"); }
function applyLock(){
  el("btnMove").classList.toggle("on",mapLocked);
  el("btnMove").textContent=mapLocked?tr("locked"):tr("move");
}
function applyPinMoveMode(){
  el("btnMoveDots").classList.toggle("on",pinMoveMode);
  el("btnMoveDots").textContent=pinMoveMode?tr("movingDots"):tr("moveDots");
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
const keyboardLabel=key=>({shift:"⇧",backspace:"⌫",space:tr("keySpace"),enter:tr("keyEnter"),close:tr("keyClose")})[key]||key;
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
  const flip=n.classList.contains("flipped");
  // Het toetsenbord staat aan dezelfde kant als de persoon: onderaan voor wie
  // vooraan staat, bovenaan voor wie aan de overkant staat. Het venster wijkt
  // dus de andere kant op.
  let top=null;
  if(flip && nr.top<kr.bottom+12) top=Math.min(innerHeight-nr.height-12,kr.bottom+12);
  else if(!flip && nr.bottom>kr.top-12) top=Math.max(12,kr.top-nr.height-12);
  if(top===null) return;
  n.style.top=(Math.max(12,top)/uiScale)+"px";
  const anchorY=Number(n.dataset.anchorY)||top+nr.height/2;
  setStem(n,nr.height/uiScale,(anchorY-top)/uiScale);
}
function showKeyboard(target){
  if(uiMode!=="touch"||!target.classList.contains("touch-type")) return;
  keyboardTarget=target;
  el("keyboardField").textContent=target.labels?.[0]?.textContent||target.placeholder||tr("typeHere");
  renderKeyboard();
  // Het toetsenbord volgt de kant waar getypt wordt: het menu heeft zijn eigen
  // leesrichting, een notitievenster die van de puck waar het aan hangt.
  el("keyboard").classList.toggle("flipped",
    target.closest("#menu")?menuFlipped():el("note").classList.contains("flipped"));
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
  const fb=el("noteFlip");
  fb.title=tr("flipSide"); fb.setAttribute("aria-label",tr("flipSide"));
  [...document.querySelectorAll(".puck-hint")].forEach(h=>
    h.textContent=mode==="touch"?tr("touchHint"):tr("laptopHint"));
  refreshKeyboardFields();
  // Een venster dat op zijn kop staat hoort niet mee te verhuizen naar de
  // laptopstand, dus dat gaat dicht bij het wisselen.
  applySides();
  closeNote();
  if(mode!=="touch") hideKeyboard();
  try{localStorage.setItem("pucktable-ui-mode",mode);}catch(e){}
  resize();
}

/* Alle hoofdonderdelen van het menu zijn compacte accordeons. Ze beginnen
   dicht, zodat het menu ook op een kleiner tafelbeeld volledig te overzien
   is. De knop en aria-expanded blijven samen de toestand vertellen. */
document.querySelectorAll("#menu .menu-sec>.accordion-head").forEach(head=>{
  head.onclick=()=>{
    const section=head.parentElement;
    const collapsed=section.classList.toggle("collapsed");
    head.setAttribute("aria-expanded",String(!collapsed));
    if(!collapsed){
      document.querySelectorAll(`#menu .menu-sec[data-view="${section.dataset.view}"]`).forEach(other=>{
        if(other===section) return;
        other.classList.add("collapsed");
        other.querySelector(":scope>.accordion-head")?.setAttribute("aria-expanded","false");
      });
    }
  };
});
el("btnMove").onclick=()=>{mapLocked=!mapLocked;gesture=null;mousePan=null;applyLock();};
el("btnMoveDots").onclick=()=>{pinMoveMode=!pinMoveMode;closeNote();applyPinMoveMode();};
function applyScale(){
  document.documentElement.style.setProperty("--ui-scale",String(uiScale));
  el("scaleVal").textContent=Math.round(uiScale*100)+"%";
  const i=UI_SCALES.indexOf(uiScale);
  el("btnScaleDown").disabled=i<=0;
  el("btnScaleUp").disabled=i>=UI_SCALES.length-1;
  try{localStorage.setItem("pucktable-ui-scale",String(uiScale));}catch(e){}
  // Een open venster hangt aan een punt op de kaart; dat punt verschuift niet
  // mee, dus beide vensters gaan opnieuw langs hun anker liggen.
  positionNoteX();
  positionNote();
  positionKgInfo();
}
function stepScale(step){
  const i=UI_SCALES.indexOf(uiScale);
  uiScale=UI_SCALES[Math.max(0,Math.min(UI_SCALES.length-1,(i<0?2:i)+step))];
  applyScale();
}
el("btnScaleDown").onclick=()=>stepScale(-1);
el("btnScaleUp").onclick=()=>stepScale(1);

/* ── Schermstand ─────────────────────────────────────────────────────
   De kaart is het gedeelde object en blijft staan; alleen de bedieningslagen
   draaien een kwartslag zonder de kaart te veranderen. */
let controlsFlipped=(()=>{
  try{ return localStorage.getItem("pucktable-controls-flipped")==="1"; }catch(e){ return false; }
})();
function refreshOrientationControl(){
  document.body.classList.toggle("controls-flipped",controlsFlipped);
  el("orientationLabel").textContent=tr(controlsFlipped?"rotateControlsBack":"rotateControls");
  el("btnOrientation").setAttribute("aria-label",el("orientationLabel").textContent);
  el("btnOrientation").setAttribute("aria-pressed",String(controlsFlipped));
  el("orientationHint").textContent=tr("orientationHint");
}
function toggleOrientation(){
  controlsFlipped=!controlsFlipped;
  try{ localStorage.setItem("pucktable-controls-flipped",controlsFlipped?"1":"0"); }catch(e){}
  refreshOrientationControl();
}
el("btnOrientation").onclick=toggleOrientation;

el("modeTouch").onclick=()=>{applyMode("touch");reorientMenu();};
el("modeLaptop").onclick=()=>{applyMode("laptop");reorientMenu();};
el("btnSim").onclick=e=>{simMode=!simMode;e.target.classList.toggle("on",simMode);};
el("btnDebug").onclick=e=>{debugMode=!debugMode;e.target.classList.toggle("on",debugMode);};
[...document.querySelectorAll(".btn-clear")].forEach(b=>b.onclick=clearPucks);

/* ── Kennisgraaf ───────────────────────────────────────────────── */
function openKgInfo(node,x,y){
  kg.selected=node;
  const n=el("kgInfo");
  n.style.display="block";
  n.style.setProperty("--kg-flip",flippedFor(y)?"180deg":"0deg");
  n.dataset.anchorX=String(x); n.dataset.anchorY=String(y);
  positionKgInfo();
  el("kgInfoType").textContent=kgDescribe(node);
  el("kgInfoLabel").textContent=node.label;
  const body=el("kgInfoBody"); body.textContent="";
  const rel=(kg.linksOf.get(node.id)||new Set()).size;
  if(rel){
    const p=document.createElement("p");
    p.className="kg-quote"; p.style.borderLeftColor="rgba(122,162,247,.5)";
    p.textContent=tr("conn",rel);
    body.appendChild(p);
  }
  const open=el("kgInfoOpen");
  open.textContent=node.type==="document"?tr("openDoc"):tr("whatSaidAbout");
  open.onclick=()=>{
    if(node.type==="document"){ openDocument(node.id,node.label); return; }
    showKgKnowledge(node);
  };
}

/* De letterlijke fragmenten over een plek, in het leesvenster naast het punt. */
async function showKgKnowledge(node){
  const body=el("kgInfoBody");
  body.textContent=tr("searching");
  const k=await knowledgeOf(node.id);
  if(kg.selected!==node) return;
  const chunks=(k?.chunks||[]).slice(0,3);
  body.textContent="";
  if(!k||!chunks.length){
    const p=document.createElement("p"); p.className="empty";
    p.textContent=k?tr("noExcerpts"):tr("noBackend");
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
function positionKgInfo(){
  const n=el("kgInfo");
  if(n.style.display!=="block") return;
  const s=uiScale, width=280*s, height=120*s;
  const x=+n.dataset.anchorX||innerWidth/2, y=+n.dataset.anchorY||innerHeight/2;
  n.style.left=(Math.max(12,Math.min(innerWidth-width-12,x+26))/s)+"px";
  n.style.top=(Math.max(12,Math.min(innerHeight-height-12,y-height/2))/s)+"px";
}
function closeKgInfo(){ kg.selected=null; el("kgInfo").style.display="none"; }
el("kgInfoClose").onclick=closeKgInfo;

/* Keep document navigation within a closable layer. The iframe is deliberately
   cleared on close so an error page cannot linger in the next document. */
function openDocument(id,title){
  const url=fileUrl(id);
  if(!url) return;
  el("documentViewerTitle").textContent=title||tr("document");
  el("documentViewerFrame").src=url;
  el("documentViewer").classList.add("open");
  el("closeDocumentViewer").focus();
}
function closeDocumentViewer(){
  el("documentViewer").classList.remove("open");
  el("documentViewerFrame").src="about:blank";
}
el("closeDocumentViewer").onclick=closeDocumentViewer;
el("documentViewer").addEventListener("pointerdown",e=>{ if(e.target===el("documentViewer")) closeDocumentViewer(); });
async function toggleGaps(){
  kg.gaps=!kg.gaps;
  markLayerMenu();
  if(kg.gaps && !kg.loaded) await ensureKG(el("kgUrl").value.trim());
}
el("noteAsk").onclick=askKnowledge;
onKgChange(()=>{
  el("kgStatus").textContent=kgStatusText();
  el("btnKg").classList.toggle("on",kg.enabled);
  el("btnKgThemes").classList.toggle("on",kg.useThemes);
});
el("btnKg").onclick=async()=>{
  kg.enabled=!kg.enabled;
  el("btnKg").classList.toggle("on",kg.enabled);
  if(!kg.enabled){ closeKgInfo(); kg.statusKey="off"; el("kgStatus").textContent=kgStatusText(); return; }
  if(!kg.nodes.length) await loadKG(el("kgUrl").value.trim());
  else el("kgStatus").textContent=kgStatusText();
};
el("btnKgThemes").onclick=async()=>{
  kg.useThemes=!kg.useThemes;
  el("btnKgThemes").classList.toggle("on",kg.useThemes);
  if(kg.useThemes && !kg.themes.length) await loadKG(el("kgUrl").value.trim());
};
el("kgUrl").onchange=()=>{ kg.nodes.length=0; kg.themes.length=0; if(kg.enabled||kg.useThemes) loadKG(el("kgUrl").value.trim()); };
el("tol").oninput=e=>{tolerance=parseFloat(e.target.value);el("tolVal").textContent=tolerance.toFixed(3);};
el("diag").oninput=resize;
/* ── Twee zijden ────────────────────────────────────────────────────────
   Een tafel ligt plat en mensen staan er omheen; wat voor de één rechtop
   staat, staat voor de ander op zijn kop. De kaart laten we met rust — dat
   is het gedeelde object, net als een papieren plattegrond die je ook niet
   voor iedereen apart draait. Maar wat persoonlijk en tijdelijk is draait
   wél mee: het venster verschijnt in de leesrichting van de rand waar de
   aanraking vandaan kwam. */
let twoSided=false;
try{ twoSided=localStorage.getItem("pucktable-two-sided")==="1"; }catch(e){}
/* De keuze blijft bewaard, maar telt alleen op een touchscreen: op een laptop
   staat er één iemand achter het scherm en is er maar één kijkrichting. */
const sidesActive=()=>twoSided && uiMode==="touch";
function applySides(){
  document.body.classList.toggle("two-sided",sidesActive());
  el("btnSides").classList.toggle("on",twoSided);
  el("btnSides").setAttribute("aria-pressed",String(twoSided));
  try{ localStorage.setItem("pucktable-two-sided",twoSided?"1":"0"); }catch(e){}
}
el("btnSides").onclick=()=>{ twoSided=!twoSided; applySides(); reorientMenu(); reorientNote(); };
applySides();

/* Staat de aanraking in de bovenste helft, dan staat de persoon aan die kant
   en moet het venster 180° gedraaid. */
const flippedFor=y=>sidesActive() && y<innerHeight/2;

/* De stengel wijst naar de puck. In een gedraaid venster loopt de lokale
   y-as andersom, dus wat op het scherm `d` vanaf de bovenkant is, is lokaal
   `h - d`. */
function setStem(n,h,d){
  const local=n.classList.contains("flipped")?h-d:d;
  n.style.setProperty("--stem-top",Math.max(20,Math.min(h-20,local))+"px");
}

el("tiles").onchange=e=>{
  MV.set=e.target.value; tileCache.clear();
  tilesTried=0; tilesFailed=0;                 // de melding gaat over dít beeld
  el("bakeHint").textContent=tr("bakeHint");
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
  b.textContent=option.dataset.i18n?tr(option.dataset.i18n):option.textContent;
  b.onclick=()=>{
    el("tiles").value=option.value;
    el("tiles").dispatchEvent(new Event("change"));
    closeLayers();
  };
  return b;
}
function buildLayerMenu(){
  const box=el("layersBody"); box.innerHTML="";

  /* Bovenaan de lagen die óver de kaart heen liggen. Het kaartbeeld eronder
     is een keuze uit één; dit zijn schakelaars, vandaar de scheiding. */
  const overlayHead=document.createElement("p");
  overlayHead.className="eyebrow"; overlayHead.textContent=tr("overlaysHead");
  box.appendChild(overlayHead);

  const gaps=document.createElement("button");
  gaps.type="button"; gaps.className="layer"; gaps.id="btnGaps";
  gaps.textContent=tr("docDensity");
  gaps.onclick=toggleGaps;
  box.appendChild(gaps);

  const note=document.createElement("p");
  note.className="hint"; note.style.margin="6px 0 0";
  note.textContent=tr("gapsNote");
  box.appendChild(note);

  const mapHead=document.createElement("p");
  mapHead.className="eyebrow layer-basemap-head"; mapHead.textContent=tr("basemap");
  box.appendChild(mapHead);

  for(const child of el("tiles").children){
    if(child.tagName==="OPTGROUP"){
      const h=document.createElement("p");
      h.className="eyebrow layer-group-head"; h.textContent=tr(child.dataset.i18nLabel||"")||child.label;
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
/* ── Menu ───────────────────────────────────────────────────────────────
   Aan een tafel waar mensen omheen staan is elk paneel dat blijft staan in de
   weg: het ligt over de kaart, het staat voor de helft van het gezelschap op
   zijn kop, en het vraagt aandacht die naar de kaart hoort. Wat je niet op
   elk moment nodig hebt — de teller, de laatste markeringen, het kaartbeeld
   en de instellingen — zit daarom achter één knop.

   Die knoppen staan er twee keer, diagonaal tegenover elkaar, zodat beide
   lange zijden ze binnen handbereik hebben. Per hoek zijn het er twee: de
   kaart en de instellingen worden om verschillende redenen gepakt en horen
   dus niet achter dezelfde tik en dezelfde scroll te zitten.

   Er blijft één menu. Het verhuist naar de knop die is ingedrukt, toont de
   inhoud die bij die knop hoort, en draait — net als het notitievenster —
   mee met de leesrichting van die kant. */
let menuSide=null;                                    // "a" | "b" | null
let menuView="settings";                              // "map" | "settings"
const MENU_BTNS=[["btnMapA","a","map"],["btnSetA","a","settings"],
                 ["btnMapB","b","map"],["btnSetB","b","settings"]];
const MENU_TITLES={map:"mapHead",settings:"appTitle"};
const menuFlipped=()=>menuSide==="b"&&sidesActive();
function openMenu(side,view){
  menuSide=side;
  menuView=view||menuView;
  const m=el("menu");
  m.classList.toggle("at-a",side==="a");
  m.classList.toggle("at-b",side==="b");
  m.classList.toggle("flipped",menuFlipped());
  m.classList.toggle("view-map",menuView==="map");
  m.classList.toggle("view-settings",menuView==="settings");
  m.classList.add("open");
  el("menuTitle").textContent=tr(MENU_TITLES[menuView]);
  MENU_BTNS.forEach(([id,s,v])=>{
    const mine=s===side&&v===menuView;
    el(id).classList.toggle("on",mine);
    el(id).setAttribute("aria-expanded",String(mine));
  });
  markLayerMenu();
  m.scrollTop=0;
}
function closeMenu(){
  if(!menuSide) return;
  menuSide=null;
  el("menu").classList.remove("open");
  MENU_BTNS.forEach(([id])=>{
    el(id).classList.remove("on");
    el(id).setAttribute("aria-expanded","false");
  });
  // Getypt werd er in een veld dat nu weg is; het toetsenbord hoort mee.
  if(keyboardTarget&&keyboardTarget.closest("#menu")) hideKeyboard(true);
}
/* Een gekozen kaartbeeld sluit het hele menu: de keuze is gemaakt en de tafel
   hoort weer leeg te zijn. */
function closeLayers(){ closeMenu(); }
/* Wisselt de leesrichting terwijl het menu openstaat, dan gaat het niet dicht
   maar draait het mee. */
const reorientMenu=()=>{ if(menuSide) openMenu(menuSide,menuView); };
/* Dezelfde knop nog eens indrukken sluit het menu; de andere knop van hetzelfde
   paar wisselt van inhoud zonder dat het venster tussendoor dichtgaat. */
MENU_BTNS.forEach(([id,side,view])=>{
  el(id).onclick=()=>(menuSide===side&&menuView===view)?closeMenu():openMenu(side,view);
});
el("menuClose").onclick=closeMenu;
// Naast het menu tikken sluit het; erin tikken uiteraard niet, en het
// schermtoetsenbord hoort erbij zolang er in een veld getypt wordt.
addEventListener("pointerdown",e=>{
  if(!menuSide) return;
  if(e.target.closest("#menu")||e.target.closest(".menu-btn")||e.target.closest("#keyboard")) return;
  closeMenu();
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
el("noteFlip").onclick=()=>flipNote();
el("noteDel").onclick=()=>{ if(selected){const i=pins.indexOf(selected); if(i>=0)pins.splice(i,1); save();} closeNote(); };
el("btnWipe").onclick=()=>{ if(confirm(tr("wipeConfirm"))){pins.length=0;save();} };
el("btnAnalytics").onclick=openAnalytics;
el("flipAnalytics").onclick=flipAnalytics;
el("closeAnalytics").onclick=closeAnalytics;
el("analytics").addEventListener("pointerdown",e=>{ if(e.target===el("analytics")) closeAnalytics(); });

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
  if(pts.length!==3){ hint.innerHTML=tr("learnNeed",pts.length); return; }
  const d=describe(pts[0],pts[1],pts[2]);
  const clash=templates.find(t=>Math.hypot(t.ratios[0]-d.ratios[0],t.ratios[1]-d.ratios[1])<0.12);
  const id="puck-"+String(templates.length+1).padStart(2,"0");
  templates.push({id,verdict:VERDICTS[templates.length%VERDICTS.length].key,
                  ratios:[+d.ratios[0].toFixed(3),+d.ratios[1].toFixed(3)]});
  CFG.longestSideMM=d.longest/pxPerMM;
  hint.innerHTML=tr("learnAdded",id,d.ratios[0].toFixed(3),d.ratios[1].toFixed(3),(d.longest/pxPerMM).toFixed(1))
                +(clash?tr("learnClash",clash.id):"");
  renderTray();
};
el("btnExport").onclick=()=>download("puck-config.json",
  JSON.stringify({longestSideMM:CFG.longestSideMM,tolerance,templates},null,2),"application/json");
function buildSheet(){
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
      <table>${pads.map((p,i)=>`<tr><td>${tr("sheetPad")} ${"ABC"[i]}</td><td>x ${p.x.toFixed(1)} mm</td><td>y ${p.y.toFixed(1)} mm</td></tr>`).join("")}
      <tr><td>${tr("sheetRatios")}</td><td colspan="2">${t.ratios[0]} / ${t.ratios[1]}</td></tr>
      <tr><td>${tr("sheetLongest")}</td><td colspan="2">${CFG.longestSideMM.toFixed(1)} mm</td></tr></table></div>`;
  }).join("");
}
el("btnSheet").onclick=()=>{ buildSheet(); el("sheet").style.display="block"; };
/* Vier manieren om het overzicht te sluiten: de knop onderaan, het kruisje
   bovenin, een tik naast het vel, en Escape. De knop onderaan alleen was te
   weinig — bij vier of meer pucks staat die buiten beeld. */
function closeSheet(){ el("sheet").style.display="none"; }
el("closeSheet").onclick=closeSheet;
el("closeSheetTop").onclick=closeSheet;
el("sheet").addEventListener("pointerdown",e=>{ if(e.target===el("sheet")) closeSheet(); });
addEventListener("keydown",e=>{
  if(e.key!=="Escape") return;
  if(el("documentViewer").classList.contains("open")){ closeDocumentViewer(); return; }
  if(el("analytics").classList.contains("open")){ closeAnalytics(); return; }
  if(el("sheet").style.display==="block"){ closeSheet(); return; }
  if(menuSide){ closeMenu(); return; }
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
      ? tr("bakeTainted")
      : tr("bakeFailed");
    return;
  }
  const rec={data,west:nw.lng,north:nw.lat,east:se.lng,south:se.lat};
  const img=new Image();
  img.onload=()=>{ bgImage={img,west:rec.west,north:rec.north,east:rec.east,south:rec.south}; };
  img.src=data;
  try{
    localStorage.setItem("pucktable-basemap",JSON.stringify(rec));
    el("bakeHint").innerHTML=tr("bakeSaved",Math.round(data.length/1024));
  }catch(err){
    el("bakeHint").innerHTML=tr("bakeTooBig");
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
  el("bakeHint").textContent=tr("bakeCleared");
};

/* ── Taalknop ───────────────────────────────────────────────────────────
   Boven in het menu, naast de titel. Niet permanent op de kaart: wie de tafel
   bedient opent het menu toch, en wie eromheen staat heeft er niets aan dat
   er nóg een knop over de plattegrond ligt. Twee vakjes in plaats van één
   wisselknop, zodat in één oogopslag te zien is welke taal aan staat.

   applyLang() gaat in één keer langs alles wat tekst draagt: de elementen met
   een data-i18n-sleutel, en daarna de stukken die door JavaScript worden
   opgebouwd en dus niet vanzelf mee veranderen. */
function applyLang(){
  document.documentElement.lang=lang;
  document.title=tr("docTitle");
  setKgLang(lang);

  document.querySelectorAll("[data-i18n]").forEach(n=>{ n.textContent=tr(n.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach(n=>{ n.innerHTML=tr(n.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-ph]").forEach(n=>{ n.placeholder=tr(n.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach(n=>{ n.setAttribute("aria-label",tr(n.dataset.i18nAria)); });
  document.querySelectorAll("[data-i18n-title]").forEach(n=>{ n.title=tr(n.dataset.i18nTitle); });
  document.querySelectorAll("[data-i18n-label]").forEach(n=>{ n.label=tr(n.dataset.i18nLabel); });

  ["langNl","langEn"].forEach(id=>{
    const mine=id==="langNl"?lang==="nl":lang==="en";
    el(id).classList.toggle("on",mine);
    el(id).setAttribute("aria-pressed",String(mine));
  });

  // Wat JavaScript zelf heeft neergezet.
  el("menuTitle").textContent=tr(MENU_TITLES[menuView]);
  el("kgStatus").textContent=kgStatusText();
  el("bakeHint").textContent=tr("bakeHint");
  buildLayerMenu();
  applyLock();
  applyPinMoveMode();
  renderTray();
  renderKeyboard();
  updateUI([]);
  [...document.querySelectorAll(".puck-hint")].forEach(h=>
    h.textContent=uiMode==="touch"?tr("touchHint"):tr("laptopHint"));
  const fb=el("noteFlip");
  if(fb){ fb.title=tr("flipSide"); fb.setAttribute("aria-label",tr("flipSide")); }
  refreshOrientationControl();
  // Een open venster hoort niet eerst dicht te moeten voordat het meegaat.
  if(selected) el("noteHead").textContent=vName(selected.verdict)+" · "+selected.topic;
  if(el("kgInfo").style.display==="block" && kg.selected){
    openKgInfo(kg.selected,+el("kgInfo").dataset.anchorX,+el("kgInfo").dataset.anchorY);
  }
  if(el("sheet").style.display==="block") buildSheet();
  refreshBuildStamp();
}
function setLang(next){
  if(next!=="nl"&&next!=="en") return;
  if(next===lang){ applyLang(); return; }
  lang=next;
  try{ localStorage.setItem("pucktable-lang",lang); }catch(e){}
  applyLang();
}
el("langNl").onclick=()=>setLang("nl");
el("langEn").onclick=()=>setLang("en");

resize(); restore(); restoreBasemap(); applyScale(); applyLock(); applyPinMoveMode(); applyMode(uiMode); renderTray(); applyLang(); frame();

/* ---- Bijgewerkt-stempel -------------------------------------------------
   Klein regeltje boven "Participatietafel": wanneer de bestanden van deze
   pagina voor het laatst zijn gewijzigd, en hoe laat deze pagina is geladen.
   Zo is te zien of een verversing de nieuwe versie heeft opgepikt. De tijd
   van wijzigen komt uit de Last-Modified-header van de bestanden; levert de
   server die niet, dan valt hij terug op document.lastModified. */
const STAMP_FILES=["./index.html","./app.js","./styles.css","./kg.js"];
function stampDate(d){
  return d.toLocaleString(tr("locale"),{day:"2-digit",month:"2-digit",year:"numeric",
                                   hour:"2-digit",minute:"2-digit"});
}
async function showBuildStamp(){
  const node=el("buildStamp"); if(!node) return;
  const loaded=new Date();
  let newest=new Date(document.lastModified);
  if(isNaN(newest.getTime())) newest=null;
  await Promise.all(STAMP_FILES.map(async(u)=>{
    try{
      const r=await fetch(u+"?stamp="+Date.now(),{method:"HEAD",cache:"no-store"});
      const h=r.headers.get("last-modified"); if(!h) return;
      const d=new Date(h);
      if(isNaN(d.getTime())) return;
      if(!newest||d>newest) newest=d;
    }catch(e){}
  }));
  const geladen=loaded.toLocaleTimeString(tr("locale"),{hour:"2-digit",minute:"2-digit"});
  node.textContent=(newest?tr("stampUpdated",stampDate(newest)):tr("stampUnknown"))+tr("stampLoaded",geladen);
}
refreshBuildStamp=showBuildStamp;
showBuildStamp();
