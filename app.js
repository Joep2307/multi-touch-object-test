import { kg, loadKG, ensureKG, drawKG, drawGaps, kgAt, kgDescribe, onKgChange,
         nearby, formatDistance, buildQuestion, ask, setKgLang, kgStatusText,
         fileUrl, knowledgeOf, relevantDocs } from "./kg.js";
import { stt, probeSTT, startTalk } from "./speech.js";

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
  /* De nieuwe puck is geen driehoek maar een ring: vijf pootjes op één cirkel.
     `ringRadiusMM` is de straal van die cirkel — buitenmaat Ø80 en kijkgat Ø56,
     dus het midden van de rand ligt op 34 mm. `ringToleranceDeg` is hoeveel elk
     gat tussen twee pootjes gemiddeld mag afwijken; met vijf punten meet de
     tafel de hoek uit vijf metingen tegelijk, dus dit mag strak staan. */
  ringRadiusMM:34, ringToleranceDeg:12,
  /* Twee getallen die het verschil maken tussen "de tafel twijfelt" en "de
     tafel kiest de verkeerde puck". De vier sjablonen liggen 14,4 graden uit
     elkaar (gemiddeld gatverschil). Een enkele grens van 9 graden liet daar
     5 graden speling in; aan een echte tafel trilt een pootje makkelijk 2 mm
     en dan is dat te streng, want de puck valt steeds weg. De grens staat nu
     op 12, en daarnaast moet de beste puck `ringMarginDeg` beter passen dan de
     op een na beste: is dat verschil kleiner, dan is de meting dubbelzinnig en
     kiest de tafel liever niets dan de verkeerde puck. `ringHoldDeg` hoort bij
     het vasthouden op vier pootjes, zie het slot van `recognise`. */
  ringMarginDeg:3, ringHoldDeg:14,
  /* Een draaiende fysieke puck onderbreekt soms heel kort één voetje. Twee
     goede beelden zijn genoeg om hem vast te pakken; daarna houden we de
     laatst bekende positie en hoek 0,9 s vast in plaats van hem na 0,18 s te
     verwijderen. */
  stableFrames:2, dropoutMS:900, smoothing:4,
  jitterPX:22, rearmPX:70, ringPX:110,
  /* De puck bedient de kaart met zijn eigen twee vrijheidsgraden: draaien
     zoomt en schuiven pant. Er is geen stand meer om eerst te kiezen — wat je
     met de puck doet, doet de kaart. `puckZoomRotDeg` is hoeveel je moet
     draaien voor één zoomniveau (met de klok mee is inzoomen), om de plek
     onder het kijkgat.
     Schuiven werkt als een joystick: de puck onthoudt een ijkpunt, en hoe
     verder hij daarvandaan ligt hoe sneller de kaart die kant op reist
     (`puckPanGain` px/s per px scheefstand, tot `puckPanMaxPXS`).
     `puckPanEaseMS` laat het ijkpunt de puck langzaam achterna komen: blijf
     duwen en je blijft reizen, laat je hem los dan staat de kaart binnen twee
     tellen weer stil. Samen met `puckPanGain` bepaalt het hoe hard de kaart
     uitloopt: bij gelijkmatig duwen reist de kaart ongeveer `gain × ease`
     keer zo snel als de puck, hier dus twee keer. Op 0 ligt het ijkpunt vast
     — een echte joystick, die blijft schuiven tot iemand de puck terugtrekt,
     en dat is aan een tafel met publiek te makkelijk te vergeten.
     De twee dode zones houden de trilling van de contactpunten eruit.
     `puckTapMS` is hoe lang een aangetikte optie oplicht, zodat je van een
     meter afstand ziet dát je tik aankwam. */
  puckTapMS:280,
  puckZoomRotDeg:90, puckRotDeadRAD:0.02, puckZoomEaseMS:70,
  /* En een bovengrens: hoe snel een puck ten hoogste kan draaien voor het
     nog een draai is. Een hand haalt anderhalve slag per seconde niet;
     alles daarboven is een meetsprong — een pootje dat wegvalt, een hand
     die over het glas strijkt, een vijftal dat een beeldje lang anders
     wordt toegewezen. Zonder deze grens komt zo'n sprong ongefilterd op
     de kaart terecht: 360 graden is vier zoomniveaus, en dan staat er
     ineens half Nederland in beeld. */
  puckRotMaxDegS:540,
  puckPanDeadPX:14, puckPanGain:2.8, puckPanMaxPXS:900, puckPanEaseMS:700,
  /* Hoe lang de stand van een puck bewaard blijft als hij van de tafel valt.
     Een slecht contact of een stoot tegen de tafel laat een puck korter dan
     dit wegvallen; die komt terug zoals hij was, niet als nieuwe puck. */
  puckMemoryMS:10000,
  /* Hoe lang de resetknop ingedrukt moet blijven voor de tafel opnieuw begint.
     Op nul is één aanraking genoeg, en dan gooit een mouw langs de knop een
     half gesprek weg. */
  resetHoldMS:700,
  retina:0,           // use the visible zoom level; avoids four times as many tile requests
  /* Eenmalig per opstelling, niet per sessie. Deze drie stonden als invoer-
     velden in het menu, waar ze bij elke herlaad terugsprongen naar hun
     beginwaarde: een instelling die niets onthoudt is geen instelling. Ze
     horen bij de tafel, dus staan ze hier, met de URL als overschrijving
     voor wie een tweede opstelling bedient (?diag=55&tol=0.08&kg=…). */
  screenDiagIn:43,    // schermdiagonaal in inch; bepaalt pxPerMM en dus de herkenning
  /* Contactvlakken worden door het touchscreen bij verschillende draaihoeken
     niet exact op hetzelfde middelpunt gemeten. 0,10 vangt die richtingsfout
     op; de vier standaardvormen liggen nog steeds verder uit elkaar. */
  tolerance:0.10,     // hoeveel de zijdeverhoudingen van een puck mogen afwijken
  kgUrl:"",           // adres van de kennisgraaf-backend; leeg = de fixtures
  /* Adres van de uitschrijfdienst. Leeg is het gewone geval: dan probeert
     speech.js eerst deze server zelf en daarna de standaardpoort op dezelfde
     machine. Alleen als de dienst ergens anders draait zet je hem hier of met
     ?stt=http://… in de URL. */
  sttUrl:""
};

/* ── Ontwikkelstand ──────────────────────────────────────────────────────
   Puck simuleren, touch-debug, een puck inlezen en de bouwtekening zijn
   gereedschap voor wie de tafel bouwt of ijkt. Aan een tafel met publiek
   eromheen zijn het alleen maar knoppen die iets kapot kunnen maken — één
   veeg over de tolerantieschuif en de herkenning is van slag. Ze staan er
   dus alleen bij als de URL erom vraagt: ?dev. Bewust niet bewaard in
   localStorage; wie het gereedschap wil, zet het er zelf bij. */
const QS=(()=>{ try{ return new URLSearchParams(location.search); }catch(e){ return new URLSearchParams(""); } })();
const DEV=QS.has("dev") && QS.get("dev")!=="0";
{ const d=parseFloat(QS.get("diag")); if(Number.isFinite(d)&&d>0) CFG.screenDiagIn=d; }
{ const t=parseFloat(QS.get("tol"));  if(Number.isFinite(t)&&t>0) CFG.tolerance=t; }
if(QS.get("kg")) CFG.kgUrl=QS.get("kg").trim();
if(QS.get("stt")) CFG.sttUrl=QS.get("stt").trim();
/* Alles wat de graaf laadt vraagt het adres hier op, zodat er maar één plek
   is waar het vandaan komt. */
const kgUrl=()=>CFG.kgUrl;
/* De uitschrijver hoeft niet dezelfde machine te zijn als de kennisgraaf, maar
   is dat meestal wel: staat er niets apart ingesteld, dan geldt het adres van
   de graaf. Is dat óók leeg, dan zoekt speech.js hem zelf. */
const sttUrl=()=>CFG.sttUrl||CFG.kgUrl;
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
       confirmTouch:"Tik het midden aan", confirmMouse:"Klik het midden aan",
       moveDots:"Dots verplaatsen", movingDots:"Klaar met verplaatsen",
       touchHint:"Sleep, tik Kiezen aan en tik dan het thema — daarmee ligt de markering vast.",
       laptopHint:"Sleep, klik Kiezen aan en klik dan het thema — daarmee ligt de markering vast.",
       puckBack:"Terug", puckPickTopic:"Kies een thema",
       helpTitle:"Zo werkt de puck", helpTurn:"Draai · zoom",
       helpMove:"Schuif · reis", helpTap:"Tik midden · kies",
       flipSide:"Naar de overkant", flipNote:"Naar de overkant",
       noNet:"Geen kaartbeeld — controleer de verbinding. Markeren werkt gewoon door.",

       locale:"nl-NL",
       docTitle:"Puck Table — participatie kaart",
       appTitle:"Participatietafel", mapHead:"Kaart", settings:"Instellingen",
       menu:"Menu", language:"Taal / Language", close:"Sluiten", open:"Openen", document:"Document",
       show:"TOON", hide:"VERBERG",
       touchscreen:"Touchscreen", exportGeo:"GeoJSON exporteren", exportCsv:"CSV exporteren",
       touchDebug:"Puck-diagnose",
       appearanceHead:"Weergave", chooseTheme:"Kleurmodus kiezen", lightMode:"☀ Licht", darkMode:"☾ Donker",
       fullscreen:"Volledig scherm", fullscreenOff:"Uit volledig scherm",

       saidWhat:"Wat is er gezegd",
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
       relations:"Relaties", relationsNote:"Lijnen tussen documenten en plekken die naar elkaar verwijzen.",
       tileBlocked:"Kaartbeeld wordt geblokkeerd. Open dit bestand lokaal in Chrome, niet in een preview-venster.",
       tileLoading:"Kaartbeeld laden…",
       tilesFoot:(a,f)=>`${a} tegels gevraagd · ${f} mislukt · of sleep een kaartafbeelding hierin`,

       bake:"Kaart offline bewaren", unbake:"Bewaarde kaart wissen",
       bakeHint:"Druk hierop mét internet; daarna werkt dit kaartbeeld ook offline.",
       bakeTainted:"<b>Dit kaartbeeld kan niet offline bewaard worden</b> — de tegelserver staat het uitlezen van de afbeelding niet toe. Kies OpenStreetMap of een PDOK-beeld en probeer het daarmee.",
       bakeFailed:"<b>Kon het kaartbeeld niet opslaan</b> — de tegels zijn nog niet volledig geladen. Wacht even en probeer opnieuw.",
       bakeSaved:(kb)=>`Kaartbeeld bewaard (${kb} kB). Dit gebied verschijnt nu ook zonder internet.`,
       bakeTooBig:"Bewaard voor deze sessie, maar te groot voor de browseropslag. Zoom iets verder uit en probeer opnieuw.",
       resetHead:"Resetknop", resetKey:"Resetknop instellen",
       resetKeyWaiting:"Druk nu op de knop…",
       resetKeyNow:(k)=>`De knop staat op <b>${k}</b>. Ingedrukt houden begint opnieuw.`,
       resetKeyNone:"Nog geen knop ingesteld.",
       resetBusy:"Opnieuw beginnen — loslaten om te stoppen",
       calm:"Kaart dempen", calmOn:"Kaart is gedempt",
       calmHint:"Gedempt is de kaart de ondergrond en zijn de markeringen het enige felle op tafel.",
       storageFull:"<b>De browseropslag zit vol.</b> Nieuwe bijdragen worden niet bewaard. Exporteer de sessie en wis hem, of maak de offline kaart leeg.",
       bakeCleared:"Bewaarde kaart gewist.",

       kgHead:"Kennisgraaf", kgShow:"Graaf tonen", kgThemes:"Thema's uit graaf",
       kgThemesHint:"De onderwerpen op de pucks komen dan uit de graaf in plaats van uit de vaste lijst.",
       analyticsHint:"Daar staan het overzicht, de export en het wissen bij elkaar.",
       devNote:"Zichtbaar omdat de URL ?dev bevat.",
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
       wipeAgain:"Zeker weten? Tik nogmaals",
       searchBusy:"Zoeken…", searchNone:"Niets gevonden onder die naam.",
       searchFailed:"Geen antwoord van de zoekdienst. Controleer de verbinding.",
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

       physicalPucks:"Fysieke pucks", recog:"Puck herkennen",
       buildTools:"Bouwgereedschap", sheetBtn:"Bouwtekening",
       exportCfg:"Config exporteren",
       recogHint:"Leg de puck op het scherm met de pijl naar boven en druk op <b>Puck herkennen</b>. Een gedrukte puck heeft vijf pootjes; drie stukjes tape in een driehoek werken ook nog.",
       recogTitle:"Puck herkennen",
       recogIntro:"Leg de puck op het vrije vlak hieronder, met de <b>pijl naar boven</b>, en houd hem stil. Zodra de pootjes gelezen zijn, kies je welke puck dit is.",
       recogWait:(n)=>`Wachten op de contactpunten van één puck — nu <b>${n}</b>. Vijf voor een gedrukte puck, drie voor een driehoek van tape. Ligt de puck er al? Dan koppelen de pootjes niet: raak ze even aan.`,
       recogHold:(n)=>`${n===5?"Vijf":"Drie"} punten gevonden — stil houden…`,
       recogMoved:"De puck bewoog — stil houden…",
       recogWhich:"Welke puck is dit?",
       recogMeasured:(a,b,mm)=>`Gemeten: ratio's ${a} / ${b}, langste zijde ${mm} mm.`,
       recogMeasuredRing:(g,mm)=>`Gemeten: vijf pootjes, gaten ${g}°, straal ${mm} mm.`,
       recogSaved:(name,a,b,mm)=>`<b>${name}</b> onthouden — ratio's ${a} / ${b}, langste zijde ${mm} mm. Dit scherm weet het ook na herladen.`,
       recogSavedRing:(name,g,mm)=>`<b>${name}</b> onthouden — gaten ${g}°, straal ${mm} mm. Dit scherm weet het ook na herladen.`,
       recogClash:(name)=>` <b style="color:var(--warn)">Lijkt te veel op ${name}</b>: maak deze driehoek duidelijk anders, anders worden ze verwisseld.`,
       recogRingSym:"Deze vijf pootjes lijken op zichzelf als je de puck een slag draait. De tafel ziet dan moeilijk welke kant voor is, en de puck klapt van beeld tot beeld om. Verschuif één pootje en meet opnieuw.",
       recogIso:"Deze driehoek is bijna gelijkbenig. De tafel ziet dan moeilijk welke kant voor is, en de puck klapt van beeld tot beeld om. Verschuif één plakker een centimeter en meet opnieuw.",
       recogAgain:"Volgende puck", recogReset:"Metingen wissen",
       recogLift:(n)=>`Haal de vorige puck van tafel \u2014 er ligt nog <b>${n}</b> contactpunt${n===1?"":"en"} op het glas. Zodra het glas leeg is begint de meting van de volgende.`,
       recogAnyway:"Meet wat er nu ligt",
       recogKnownOnTable:(n)=>` Er ${n===1?"ligt":"liggen"} al <b>${n}</b> ingelezen puck${n===1?"":"s"} op tafel; ${n===1?"die telt":"die tellen"} niet mee.`,
       recogNoneKnownSeen:(n)=>` Van de <b>${n}</b> ingelezen puck${n===1?"":"s"} wordt er nu geen herkend, dus alle punten tellen mee.`,
       recogExport:"Metingen exporteren",
       recogLearned:(t)=>`ingelezen ${t}`, recogFactory:"nog niet ingelezen",
       recogCleared:"Alle metingen gewist — de pucks staan weer op de maten van de bouwtekening.",
       modePuck:"Puck", puckAdd:"+ Puck",
       modePuckHint:"De balk onderaan is weg. De tafel herkent alleen pucks die je zelf hebt ingelezen.",
       sidesHintPuck:"De toevoegknop aan beide kanten; vensters draaien naar wie ze opent.",
       recogIntroOwn:"Leg de puck op het vrije vlak hieronder, met de <b>pijl naar boven</b>, en houd hem stil. Zodra de pootjes gelezen zijn, zeg je wat voor puck dit is; hij komt er dan bij.",
       recogWhichKind:"Wat voor puck is dit?",
       recogKindCount:(n)=>n===0?"nog geen puck van deze soort":n===1?"1 puck van deze soort":`${n} pucks van deze soort`,
       recogKnown:(n)=>n===1?"1 puck ingelezen":`${n} pucks ingelezen`,
       recogNoneYet:"Nog geen puck ingelezen. Tot die tijd herkent de tafel niets.",
       recogRemove:"Deze puck weggooien", recogRemoved:"Puck weggegooid.",
       recogResetOwn:"Alle pucks wissen",
       recogClearedOwn:"Alle eigen pucks weggegooid. Lees er een in om weer iets te laten herkennen.",
       sheetTitle:"Bouwtekening pucks",
       sheetIntro:"Padposities per puck, in millimeters vanaf het midden. Bij de gedrukte pucks liggen vijf pootjes op één cirkel; de gaten ertussen liggen ver genoeg uit elkaar om de vier pucks met een paar graden meetfout nog te onderscheiden.",
       sheetPad:"Pad", sheetRatios:"Ratio's", sheetLongest:"Langste",
       sheetGaps:"Gaten", sheetRing:"Straal",

       deselect:"Deselecteren",
       newNote:"Nieuwe bijdrage", fTitle:"Titel", titlePh:"Geef deze bijdrage een titel",
       fDescription:"Beschrijving", descPh:"Wat is hier aan de hand?",
       del:"Verwijderen", saveBtn:"Bewaren",
       contactTitle:"Op de hoogte blijven?",
       contactIntro:"Laat je contactgegevens achter als je wilt horen wat er met deze bijdrage gebeurt.",
       contactName:"Naam (optioneel)", contactNamePh:"Je naam",
       contactEmail:"E-mail (optioneel)", contactEmailPh:"naam@voorbeeld.nl",
       contactPhone:"Telefoon (optioneel)", contactPhonePh:"06 …",
       contactConsent:"Ja, ik geef toestemming om mij over deze bijdrage te benaderen.",
       contactSkip:"Nee, bedankt", contactSave:"Contact bewaren",
       contactNeedDetail:"Vul ten minste een e-mailadres of telefoonnummer in.",
       contactNeedConsent:"Vink eerst aan dat we je hierover mogen benaderen.",
       contactInvalidEmail:"Controleer het e-mailadres.", contactSaved:"Contactgegevens bewaard.",
       talkHead:"Gesprek", talkStart:"Gesprek opnemen", talkStop:"Opname stoppen",
       talkLangGroup:"Taal van het gesprek", talkLangAuto:"Auto",
       talkLangAutoTip:"De tafel bepaalt per stukje zelf welke taal er gesproken wordt.",
       talkClear:"Tekst wissen", talkAudio:"Opname bewaren",
       talkPh:"Wat er gezegd wordt komt hier te staan.",
       talkListening:"Luistert mee \u2014 praat gewoon door.",
       talkWriting:"Luistert mee \u2014 de tekst loopt een paar tellen achter.",
       talkRecording:"Neemt op. Uitschrijven kan hier niet, dus bewaar de opname als je klaar bent.",
       talkStarting:"Microfoon aanzetten\u2026",
       talkDone:(n)=>`Opname gestopt \u00b7 ${n} ${n===1?"woord":"woorden"} uitgeschreven.`,
       talkOnlyAudio:"Uitschrijven kan hier niet \u2014 de tafel neemt het gesprek wel op, zodat je het later kunt uitschrijven.",
       talkNoText:"Opname gestopt \u2014 er is niets herkend.",
       talkAudioReady:"Opname klaar om te bewaren.",
       talkDenied:"Geen toegang tot de microfoon. Sta hem toe in de browser en probeer opnieuw.",
       talkInsecure:"Uitschrijven kan alleen op de tafel zelf (http://localhost) of via https.",
       talkNoMic:"Deze browser geeft geen microfoon \u2014 uitschrijven kan hier niet.",
       talkBackendGone:"De uitschrijfdienst antwoordt niet meer. De opname loopt door.",
       talkBrowserGone:"De spraakherkenning van deze browser doet niets. Probeer het in Chrome, of zet de uitschrijfdienst aan.",
       talkCheck:"Kijken wat deze tafel kan\u2026",
       talkBusy:"De microfoon is aan de overkant in gebruik.",
       alreadyKnown:"Wat is hier al bekend", aboutWhatYouSay:"Gaat over wat je zegt",
       askSolution:"Vraag om een oplossing",
       onscreenKeyboard:"Schermtoetsenbord", keyboardHead:"Toetsenbord",
       movePanel:"Verslepen \u00b7 dubbeltik zet terug",
       keySpace:"Spatie", keyEnter:"Enter", keyClose:"Sluiten", typeHere:"Tekst invoeren",
       stampUpdated:(d)=>`bijgewerkt ${d}`, stampUnknown:"bijgewerkt onbekend",
       stampLoaded:(t)=>` · geladen ${t}` },

  en:{ good:"Good", bad:"Problem", talk:"Discussion", idea:"Idea",
       topics:["Safety","Traffic","Green","Waste","Social","Other"],
       move:"Freeze map", locked:"Map is frozen", placed:"Marked",
       confirmTouch:"Tap the centre", confirmMouse:"Click the centre",
       moveDots:"Move dots", movingDots:"Finish moving",
       touchHint:"Drag, tap Select and then the theme — that places the mark.",
       laptopHint:"Drag, click Select and then the theme — that places the mark.",
       puckBack:"Back", puckPickTopic:"Pick a theme",
       helpTitle:"How the puck works", helpTurn:"Turn · zoom",
       helpMove:"Slide · travel", helpTap:"Tap centre · choose",
       flipSide:"To the other side", flipNote:"To the other side",
       noNet:"No map tiles — check the connection. Marking still works.",

       locale:"en-GB",
       docTitle:"Puck Table — participation map",
       appTitle:"Participation table", mapHead:"Map", settings:"Settings",
       menu:"Menu", language:"Language / Taal", close:"Close", open:"Open", document:"Document",
       show:"SHOW", hide:"HIDE",
       touchscreen:"Touchscreen", exportGeo:"Export GeoJSON", exportCsv:"Export CSV",
       touchDebug:"Puck diagnostics",
       appearanceHead:"Appearance", chooseTheme:"Choose colour mode", lightMode:"☀ Light", darkMode:"☾ Dark",
       fullscreen:"Full screen", fullscreenOff:"Leave full screen",

       saidWhat:"What was said",
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
       relations:"Relations", relationsNote:"Lines between documents and places that refer to each other.",
       tileBlocked:"Map tiles are being blocked. Open this file locally in Chrome, not in a preview window.",
       tileLoading:"Loading map tiles…",
       tilesFoot:(a,f)=>`${a} tiles requested · ${f} failed · or drop a map image in here`,

       bake:"Save map offline", unbake:"Clear saved map",
       bakeHint:"Press this while online; after that this map view also works offline.",
       bakeTainted:"<b>This map view cannot be saved offline</b> — the tile server does not allow the image to be read back. Choose OpenStreetMap or a PDOK view and try again with that.",
       bakeFailed:"<b>Could not save the map view</b> — the tiles have not fully loaded yet. Wait a moment and try again.",
       bakeSaved:(kb)=>`Map view saved (${kb} kB). This area now also appears without an internet connection.`,
       bakeTooBig:"Saved for this session, but too large for browser storage. Zoom out a little and try again.",
       resetHead:"Reset button", resetKey:"Set the reset button",
       resetKeyWaiting:"Press the button now…",
       resetKeyNow:(k)=>`The button is set to <b>${k}</b>. Hold it to start over.`,
       resetKeyNone:"No button set yet.",
       resetBusy:"Starting over — let go to stop",
       calm:"Mute the map", calmOn:"Map is muted",
       calmHint:"Muted, the map is the background and the marks are the only bright thing on the table.",
       storageFull:"<b>Browser storage is full.</b> New contributions are not being saved. Export the session and wipe it, or clear the offline map.",
       bakeCleared:"Saved map cleared.",

       kgHead:"Knowledge graph", kgShow:"Show graph", kgThemes:"Themes from graph",
       kgThemesHint:"Puck topics then come from the graph instead of the fixed list.",
       analyticsHint:"The overview, the exports and clearing are together there.",
       devNote:"Visible because the URL contains ?dev.",
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
       wipeAgain:"Sure? Tap again",
       searchBusy:"Searching…", searchNone:"Nothing found under that name.",
       searchFailed:"No answer from the search service. Check the connection.",
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

       physicalPucks:"Physical pucks", recog:"Recognise puck",
       buildTools:"Build tools", sheetBtn:"Build drawing",
       exportCfg:"Export config",
       recogHint:"Put the puck on the screen with its arrow pointing up and press <b>Recognise puck</b>. A printed puck has five feet; three pieces of tape in a triangle still work too.",
       recogTitle:"Recognise puck",
       recogIntro:"Put the puck on the open area below with its <b>arrow pointing up</b> and hold it still. As soon as the feet are read, you pick which puck this is.",
       recogWait:(n)=>`Waiting for the contact points of one puck — now <b>${n}</b>. Five for a printed puck, three for a tape triangle. Is the puck already there? Then the feet are not coupling: touch them briefly.`,
       recogHold:(n)=>`${n===5?"Five":"Three"} points found — hold still…`,
       recogMoved:"The puck moved — hold still…",
       recogWhich:"Which puck is this?",
       recogMeasured:(a,b,mm)=>`Measured: ratios ${a} / ${b}, longest side ${mm} mm.`,
       recogMeasuredRing:(g,mm)=>`Measured: five feet, gaps ${g}°, radius ${mm} mm.`,
       recogSaved:(name,a,b,mm)=>`<b>${name}</b> remembered — ratios ${a} / ${b}, longest side ${mm} mm. This screen keeps it after a reload.`,
       recogSavedRing:(name,g,mm)=>`<b>${name}</b> remembered — gaps ${g}°, radius ${mm} mm. This screen keeps it after a reload.`,
       recogClash:(name)=>` <b style="color:var(--warn)">Too much like ${name}</b>: make this triangle clearly different, or the two will be swapped.`,
       recogRingSym:"These five feet look like themselves when the puck is turned one step. The table then struggles to see which way is forward, and the puck flips from frame to frame. Move one foot and measure again.",
       recogIso:"This triangle is nearly isosceles. The table then struggles to see which way is forward, and the puck flips from frame to frame. Move one pad a centimetre and measure again.",
       recogAgain:"Next puck", recogReset:"Clear measurements",
       recogLift:(n)=>`Take the previous puck off the table \u2014 <b>${n}</b> contact point${n===1?"":"s"} still on the glass. Measuring the next one starts once the glass is clear.`,
       recogAnyway:"Measure what is there now",
       recogKnownOnTable:(n)=>` <b>${n}</b> known puck${n===1?"":"s"} already on the table; ${n===1?"it does":"they do"} not count.`,
       recogNoneKnownSeen:(n)=>` None of the <b>${n}</b> known puck${n===1?"":"s"} is being recognised right now, so every point counts.`,
       recogExport:"Export measurements",
       recogLearned:(t)=>`read in ${t}`, recogFactory:"not read in yet",
       recogCleared:"All measurements cleared — the pucks are back on the sizes from the build drawing.",
       modePuck:"Puck", puckAdd:"+ Puck",
       modePuckHint:"The bar at the bottom is gone. The table only recognises pucks you have read in yourself.",
       sidesHintPuck:"The add button on both sides; windows turn to whoever opens them.",
       recogIntroOwn:"Put the puck on the open area below with its <b>arrow pointing up</b> and hold it still. As soon as the feet are read, you say what kind of puck this is and it is added.",
       recogWhichKind:"What kind of puck is this?",
       recogKindCount:(n)=>n===0?"no puck of this kind yet":n===1?"1 puck of this kind":`${n} pucks of this kind`,
       recogKnown:(n)=>n===1?"1 puck read in":`${n} pucks read in`,
       recogNoneYet:"No puck read in yet. Until then the table recognises nothing.",
       recogRemove:"Throw this puck away", recogRemoved:"Puck thrown away.",
       recogResetOwn:"Clear all pucks",
       recogClearedOwn:"All your own pucks are gone. Read one in to have the table recognise something again.",
       sheetTitle:"Puck build drawing",
       sheetIntro:"Pad positions per puck, in millimetres from the centre. On the printed pucks five feet lie on one circle; the gaps between them lie far enough apart to tell the four pucks apart with a few degrees of measurement error.",
       sheetPad:"Pad", sheetRatios:"Ratios", sheetLongest:"Longest",
       sheetGaps:"Gaps", sheetRing:"Radius",

       deselect:"Deselect",
       newNote:"New contribution", fTitle:"Title", titlePh:"Give this contribution a title",
       fDescription:"Description", descPh:"What is going on here?",
       del:"Delete", saveBtn:"Save",
       contactTitle:"Stay up to date?",
       contactIntro:"Leave your contact details if you would like to hear what happens with this contribution.",
       contactName:"Name (optional)", contactNamePh:"Your name",
       contactEmail:"Email (optional)", contactEmailPh:"name@example.com",
       contactPhone:"Phone (optional)", contactPhonePh:"Phone number",
       contactConsent:"Yes, I consent to being contacted about this contribution.",
       contactSkip:"No, thanks", contactSave:"Save contact details",
       contactNeedDetail:"Enter at least an email address or phone number.",
       contactNeedConsent:"First confirm that we may contact you about this.",
       contactInvalidEmail:"Check the email address.", contactSaved:"Contact details saved.",
       talkHead:"Conversation", talkStart:"Record conversation", talkStop:"Stop recording",
       talkLangGroup:"Language of the conversation", talkLangAuto:"Auto",
       talkLangAutoTip:"The table works out which language is spoken, chunk by chunk.",
       talkClear:"Clear text", talkAudio:"Save recording",
       talkPh:"What is said appears here.",
       talkListening:"Listening \u2014 just keep talking.",
       talkWriting:"Listening \u2014 the text runs a few seconds behind.",
       talkRecording:"Recording. This table cannot transcribe, so save the recording when you are done.",
       talkStarting:"Turning on the microphone\u2026",
       talkDone:(n)=>`Recording stopped \u00b7 ${n} ${n===1?"word":"words"} written out.`,
       talkOnlyAudio:"Transcribing is not possible here \u2014 the table can record the conversation so you can write it out later.",
       talkNoText:"Recording stopped \u2014 nothing was recognised.",
       talkAudioReady:"Recording ready to save.",
       talkDenied:"No access to the microphone. Allow it in the browser and try again.",
       talkInsecure:"Transcribing only works on the table itself (http://localhost) or over https.",
       talkNoMic:"This browser offers no microphone \u2014 transcribing is not possible here.",
       talkBackendGone:"The transcription service stopped answering. The recording continues.",
       talkBrowserGone:"This browser's speech recognition does nothing. Try Chrome, or start the transcription service.",
       talkCheck:"Checking what this table can do\u2026",
       talkBusy:"The microphone is in use on the other side.",
       alreadyKnown:"What is already known here", aboutWhatYouSay:"Relates to what you say",
       askSolution:"Ask for a solution",
       onscreenKeyboard:"On-screen keyboard", keyboardHead:"Keyboard",
       movePanel:"Drag \u00b7 double-tap to reset",
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
if(uiMode!=="touch"&&uiMode!=="laptop"&&uiMode!=="puck") uiMode=matchMedia("(pointer:coarse)").matches?"touch":"laptop";
/* Drie standen. `touch` en `puck` zijn allebei een tafel — grote knoppen, eigen
   toetsenbord, vensters die meedraaien — maar in de puckstand is de balk met
   sleepkopieen weg en telt alleen wat er echt op het glas ligt. Vandaar een
   hulpje voor "dit is een tafel" en een voor de puckstand zelf. */
const tableUi=()=>uiMode!=="laptop";
const puckMode=()=>uiMode==="puck";
/* Kleurmodus begint altijd donker. De tafel staat in een zaal waar het licht
   laag is en de kaart mag daar niet in het gezicht schijnen; een resetknop
   levert dan ook weer een donker scherm op. Wat er tijdens de sessie gekozen
   wordt geldt voor die sessie, en de voorkeur van het apparaat of een eerdere
   keuze bepaalt het begin dus niet meer. */
let colorTheme="dark";
/* De bediening kan mee groeien met de tafel: op een 43"-scherm dat een meter
   verderop staat is 100% te klein, op een laptop is 150% belachelijk. Vaste
   trappen in plaats van een schuif, want dit wordt met een vinger bediend.
   `zoom` doet het werk in CSS; hier zit alleen de waarde. Alle plaatsing die
   in JavaScript gebeurt rekent in schermpixels en moet dus door deze factor
   gedeeld worden voordat ze als style.left/top op een venster belandt. */
const UI_SCALES=[0.7,0.8,0.9,1,1.15,1.3,1.5,1.75,2];
/* Tafel-eerst. styles.css is geschreven op de maat van de tafel: iemand die
   staat, op zo'n 80 cm, onder een hoek. De laptop is het uitzonderingsgeval en
   begint dus ingekrompen — vroeger stond het andersom en moest de tafel met de
   hand omhoog. De schaal hoort bij de stand en wordt daarom per stand
   onthouden: wie de tafel op 115% zet, zet daarmee niet de laptop scheef. */
const defaultUiScale=()=>uiMode==="laptop"?0.8:1;
function storedUiScale(){
  try{ const v=parseFloat(localStorage.getItem("pucktable-ui-scale-"+uiMode));
       return UI_SCALES.includes(v)?v:defaultUiScale(); }catch(e){ return defaultUiScale(); }
}
let uiScale=storedUiScale();
/* Eén chipvorm voor de ring om de puck en de knoppen in de panelen: het is
   allebei een woord waar je op kunt kiezen. De maten komen uit dezelfde tokens
   als de knoppen (--chip-* en --text-2xs in styles.css) maal de bedienings-
   schaal, zodat een label op de ring en een knop in het menu even groot zijn
   en dezelfde hoeken hebben. */
const CHIP_FAMILY="'Space Grotesk',system-ui,sans-serif";
const CHIP={font:15,padX:18,padY:14,radius:16};
function readChip(){
  const cs=getComputedStyle(document.documentElement);
  const px=(name,fallback)=>{ const v=parseFloat(cs.getPropertyValue(name));
                              return Number.isFinite(v)?v:fallback; };
  CHIP.font  =px("--text-2xs",15)*uiScale;
  CHIP.padX  =px("--chip-pad-x",18)*uiScale;
  CHIP.padY  =px("--chip-pad-y",14)*uiScale;
  CHIP.radius=px("--chip-radius",16)*uiScale;
}
const chipHeight=()=>Math.round(CHIP.font*1.2+CHIP.padY);
const VERDICTS=[{key:"good",color:"#39d8a4"},{key:"bad",color:"#ff5f56"},
                {key:"talk",color:"#c48cff"},{key:"idea",color:"#ffd166"}];
const vName=k=>L[lang][k], vColor=k=>VERDICTS.find(v=>v.key===k).color;
const topics=()=>(kg.useThemes&&kg.themes.length?kg.themes:L[lang].topics);
/* ── Twee soorten pucks ──────────────────────────────────────────
   De oude puck is een driehoek van drie stukjes koperfolie: `ratios` (de twee
   kortste zijden gedeeld door de langste) en `longestMM`. De nieuwe puck is een
   ring: vijf pootjes op één cirkel, dus `angles` — vijf hoeken in graden, met de
   klok mee gerekend vanaf de richtingspijl — en `ringMM`, de straal van die
   cirkel. Beide soorten staan door elkaar in dezelfde lijst, want een tafel
   waar de nieuwe pucks al liggen mag de oude tape-pucks niet ineens vergeten.
   Alles wat een sjabloon aanraakt vraagt daarom eerst `isRing()`.

   Met de klok mee: op het scherm loopt y naar beneden, dus een groeiende hoek
   draait rechtsom. Dat geldt voor de sjablonen én voor de meting, en die twee
   worden alleen met elkaar vergeleken — spiegelen valt zo nergens tussenuit. */
const isRing=t=>Array.isArray(t?.angles)&&t.angles.length===5;
const cloneTpl=t=>({...t,...(isRing(t)?{angles:[...t.angles]}:{ratios:[...t.ratios]})});
/* Rond de nul moet dit twee keer hetzelfde antwoord geven. Een pootje vlak
   rechts van het midden komt uit op 359,999… graden; die waarde nog een keer
   door dezelfde som halen levert in drijvende komma 0 op. En `gapsOf`
   normaliseert en sorteert zíjn hoeken nog eens, dus zo’n pootje stond daar
   vooraan en in `describeRing` achteraan: de gaten hoorden dan bij de
   verkeerde pootjes en de puck sprong één pootje verder — 72 graden, zomaar,
   bij precies één stand. Vandaar dat bijna-0 en bijna-360 allebei 0 worden. */
const norm360=a=>{ const v=((a%360)+360)%360; return (v<1e-9||v>360-1e-9)?0:v; };
/* De gaten tussen de pootjes, met de klok mee. Dit is wat een ringpuck
   herkenbaar maakt: draai de puck en de vijf hoeken lopen allemaal mee, maar de
   gaten ertussen blijven staan. */
function gapsOf(angles){
  const a=[...angles].map(norm360).sort((x,y)=>x-y);
  return a.map((v,i)=>norm360((i===a.length-1?a[0]+360:a[i+1])-v));
}
/* De vier pucks van de bouwtekening. De hoeken zijn zo gekozen dat geen enkele
   puck op zichzelf lijkt als je hem een slag draait (anders wisselt de voorkant
   per beeldje en loopt het ringmenu vast) en dat de vier onderling minstens
   14° per gat uit elkaar liggen — ruim boven de ruis van een pootje van 2 mm.
   De pijl wijst in het midden van het grootste gat, zodat er geen pootje voor
   staat; hoek 0 is die pijl. */
let templates=[
  {id:"puck-01",angles:[54,124,206,250,306],ringMM:34,verdict:"good"},
  {id:"puck-02",angles:[56,100,168,218,304],ringMM:34,verdict:"bad"},
  {id:"puck-03",angles:[52,120,166,210,308],ringMM:34,verdict:"talk"},
  {id:"puck-04",angles:[53,99,195,263,307],ringMM:34,verdict:"idea"}
];
/* Wat hierboven staat is de fabriekswaarde: de vier pucks van de bouwtekening.
   Een puck die je aan de tafel inleest overschrijft de driehoek van één van
   deze vier — het aantal pucks verandert dus nooit door te meten. `TPL_FACTORY`
   bewaart het origineel, zodat "Metingen wissen" iets heeft om naar terug te
   keren. */
const TPL_FACTORY=templates.map(cloneTpl);
const TPL_KEY="pucktable-templates";
/* De langste zijde hoort bij de púck, niet bij de tafel: geknipte tape is nooit
   precies 60 mm en twee pucks mogen best verschillen. `CFG.longestSideMM` is de
   terugval voor een puck die nog nooit is ingelezen. */
const tplLongest=t=>(t&&Number.isFinite(t.longestMM)&&t.longestMM>0)?t.longestMM:CFG.longestSideMM;
/* Hetzelfde verhaal voor de ring: de straal hoort bij de púck. Een gedrukte
   puck is nauwkeuriger dan geknipte tape, maar de tafel meet hem toch. */
const tplRing=t=>(t&&Number.isFinite(t.ringMM)&&t.ringMM>0)?t.ringMM:CFG.ringRadiusMM;
/* Hoe breed een puck op het glas ligt: bij een driehoek de langste zijde, bij
   een ring de diameter. Deze maat bepaalt het zoekraster in `recognise`. */
const tplSpanMM=t=>isRing(t)?2*tplRing(t):tplLongest(t);
const maxTplSpan=()=>activeTemplates().reduce((m,t)=>Math.max(m,tplSpanMM(t)),CFG.longestSideMM);
/* Wat er van een sjabloon op schijf gaat, welke vorm het ook heeft. De velden
   van de andere vorm staan er als null bij: zo is aan het bestand te zien dat
   ze bewust leeg zijn en niet per ongeluk zijn weggevallen. */
const tplWire=t=>({id:t.id,verdict:t.verdict,
                   ratios:t.ratios||null,longestMM:t.longestMM??null,
                   angles:t.angles||null,ringMM:t.ringMM??null,
                   learnedAt:t.learnedAt||null});
/* Een meting mag de vorm van een puck omzetten: lees je een oude driehoek in op
   een puck die af fabriek een ring is, dan is die puck vanaf dat moment een
   driehoek. De velden van de vorige vorm gaan weg, anders staan er twee
   beschrijvingen van dezelfde puck en raadt de herkenning welke telt. */
function applyShape(tpl,sv){
  if(Array.isArray(sv?.angles)&&sv.angles.length===5&&sv.angles.every(n=>Number.isFinite(n))){
    tpl.angles=sv.angles.map(norm360); delete tpl.ratios; delete tpl.longestMM;
    if(Number.isFinite(sv.ringMM)&&sv.ringMM>0) tpl.ringMM=sv.ringMM; else delete tpl.ringMM;
    return true;
  }
  if(Array.isArray(sv?.ratios)&&sv.ratios.length===2&&
     sv.ratios.every(n=>Number.isFinite(n)&&n>0&&n<=1.001)){
    tpl.ratios=[sv.ratios[0],sv.ratios[1]]; delete tpl.angles; delete tpl.ringMM;
    if(Number.isFinite(sv.longestMM)&&sv.longestMM>0) tpl.longestMM=sv.longestMM; else delete tpl.longestMM;
    return true;
  }
  return false;
}
function saveTemplates(){
  try{ localStorage.setItem(TPL_KEY,JSON.stringify(templates.map(tplWire))); }catch(e){}
}
/* Alleen de vier bekende pucks worden bijgewerkt. Wat er in localStorage staat
   is een meting, geen nieuwe puck: een oud of vreemd bestand kan er dus nooit
   een puck bij verzinnen die de code niet kent. */
function restoreTemplates(){
  let saved=null;
  try{ saved=JSON.parse(localStorage.getItem(TPL_KEY)||"null"); }catch(e){ return; }
  if(!Array.isArray(saved)) return;
  for(const sv of saved){
    const tpl=templates.find(t=>t.id===sv?.id); if(!tpl) continue;
    if(!applyShape(tpl,sv)) continue;
    if(typeof sv.learnedAt==="string") tpl.learnedAt=sv.learnedAt;
  }
}
function resetTemplates(){
  for(const t of templates){
    const f=TPL_FACTORY.find(x=>x.id===t.id); if(!f) continue;
    /* Eerst alle vormvelden weg: een puck die als driehoek is ingelezen moet
       weer de ring van de bouwtekening worden, niet allebei tegelijk. */
    delete t.ratios; delete t.longestMM; delete t.angles; delete t.ringMM; delete t.learnedAt;
    Object.assign(t,cloneTpl(f));
  }
  try{ localStorage.removeItem(TPL_KEY); }catch(e){}
}
/* -- Eigen pucks: de lijst van de puckstand ---------------------------------
   In de puckstand bestaat er geen vaste verzameling pucks. Wat de tafel
   herkent is precies wat er is ingelezen en niets anders: ook geen fabrieks-
   driehoek als terugval, want dan wijst een tafel waar nog niets van jou op
   ligt toch iets aan. De lijst staat los van `templates` en in zijn eigen
   sleutel, zodat de vier pucks van de bouwtekening er nooit door overschreven
   worden. Twee pucks mogen dezelfde soort hebben — twee mensen met allebei een
   Probleem-puck is een gewone tafel, geen fout. */
const OWN_KEY="pucktable-own-pucks";
let ownPucks=[], ownSeq=0;
function saveOwnPucks(){
  try{ localStorage.setItem(OWN_KEY,JSON.stringify(ownPucks.map(tplWire))); }catch(e){}
}
/* Alleen wat er echt uitziet als een meting komt binnen: een onbekende soort of
   een onmogelijke ratio zou de herkenning stilletjes van slag brengen. */
function restoreOwnPucks(){
  let saved=null;
  try{ saved=JSON.parse(localStorage.getItem(OWN_KEY)||"null"); }catch(e){ return; }
  if(!Array.isArray(saved)) return;
  for(const sv of saved){
    if(!sv||typeof sv.id!=="string") continue;
    if(!VERDICTS.some(v=>v.key===sv.verdict)) continue;
    if(ownPucks.some(t=>t.id===sv.id)) continue;
    const p={id:sv.id,verdict:sv.verdict,
             learnedAt:typeof sv.learnedAt==="string"?sv.learnedAt:null,own:true};
    if(!applyShape(p,sv)) continue;
    ownPucks.push(p);
    const n=parseInt(String(sv.id).replace(/^\D+/,""),10);
    if(Number.isFinite(n)) ownSeq=Math.max(ownSeq,n);
  }
}
/* `shape` is één meting: {ratios,longestMM} van een driehoek of {angles,ringMM}
   van een ring. Welke van de twee het is, bepaalt wat er straks op tafel wordt
   gezocht. */
function addOwnPuck(verdict,shape){
  const p={id:"eigen-"+String(++ownSeq).padStart(2,"0"),verdict,
           learnedAt:new Date().toISOString(),own:true};
  if(!applyShape(p,shape)) return null;
  ownPucks.push(p); saveOwnPucks(); return p;
}
/* Weggooien haalt ook de puck die op dat moment herkend wordt van tafel: anders
   blijft er een markering hangen die bij een sjabloon hoort dat niet meer
   bestaat. */
function removeOwnPuck(id){
  const i=ownPucks.findIndex(t=>t.id===id);
  if(i<0) return;
  ownPucks.splice(i,1); saveOwnPucks();
  for(const [k,t] of [...tracks]) if(t.tpl&&t.tpl.id===id) tracks.delete(k);
}
/* Welke lijst telt hangt aan de stand: in de puckstand alleen de eigen pucks,
   daarbuiten de vier van de bouwtekening. */
const activeTemplates=()=>puckMode()?ownPucks:templates;
/* `simMode` bepaalt of de contactpunten van pucks uit de balk meetellen bij de
   herkenning — en de balk is geen ontwikkelgereedschap maar de gewone manier om
   zonder fysieke puck te werken. Stond dit op `DEV`, dan liet een tafel zonder
   ?dev in de URL de sleepkopie wél volgen, maar verscheen er nooit een puck: de
   puck lag er, maar had geen pads om herkend te worden. Vandaar `true`; de
   dev-knop "Puck simuleren" kan hem nog steeds uitzetten. */
let simMode=true, debugMode=false, tolerance=CFG.tolerance, pxPerMM=4, mapLocked=false;
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
  /* Een tegel die één keer misging bleef voor altijd als gat in de kaart
     staan: een netwerkhikje van vijf seconden was een blijvend gat tot iemand
     van kaartbeeld wisselde. Na een halve minuut mag hij het opnieuw proberen. */
  if(img&&img.bad&&performance.now()-(img.badAt||0)>30000){ tileCache.delete(key); img=null; }
  if(img){
    // Meest recent gebruikt achteraan: zo overleeft het gebied waar de tafel
    // de hele dag omheen pant, in plaats van als eerste te vertrekken.
    tileCache.delete(key); tileCache.set(key,img);
  }
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
        retry.onerror=()=>{retry.bad=true;retry.badAt=performance.now();tilesFailed++;tileChanged();};
        retry.src=src;
        tileCache.set(key,retry);
        return;
      }
      img.bad=true; img.badAt=performance.now(); tilesFailed++; tileChanged();
    };
    img.src=src;
    tileCache.set(key,img); tilesTried++;
    /* 1600 gedecodeerde tegels is honderden megabytes beeldgeheugen in een
       browser die de hele dag doordraait, en het was de oudst tóégevoegde die
       vertrok — niet de langst ongebruikte. Nu een echte LRU, en kleiner. */
    while(tileCache.size>600){ const k=tileCache.keys().next().value; tileCache.delete(k); }
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
/* ── De resetknop ────────────────────────────────────────────────────────
   Een knop naast de tafel waarmee iemand de tafel opnieuw begint. Zulke
   USB-knoppen doen zich voor als een toetsenbord en sturen één toets, maar
   welke toets dat is verschilt per knop en staat nergens op de doos. De tafel
   leest hem daarom zelf uit: "Resetknop instellen" in de instellingen, dan één
   keer drukken, en de toetscode gaat in localStorage — bij de tafel dus, niet
   in de code.

   Ingedrukt houden, niet tikken. Iemand die tegen de tafelrand leunt of langs
   de knop strijkt gooit anders een half gesprek weg; nu loopt er eerst een
   ring vol en is loslaten genoeg om je te bedenken. */
/* Standaard staat de knop op A: de knop die naast de tafel ligt stuurt die
   toets, en zo doet hij het ook op een schoon apparaat zonder eerst
   "Resetknop instellen" te doorlopen. Een uitgelezen toets gaat nog steeds
   vóór, want die hoort bij dat ene apparaat. */
const RESET_KEY_DEFAULT="KeyA";
let resetKey=(()=>{ try{ return localStorage.getItem("pucktable-reset-key")||RESET_KEY_DEFAULT; }catch(e){ return RESET_KEY_DEFAULT; } })();
let resetLearning=false, resetHeldAt=0;
/* `e.code` is de plek van de toets, niet het teken: dat is precies wat je van
   een knop wilt weten, en het verandert niet mee met de toetsenbordindeling. */
const keyLabel=code=>code.replace(/^Key/,"").replace(/^Digit/,"").replace(/^Numpad/,"num ")||code;
function applyResetKey(){
  const b=el("btnResetKey");
  b.classList.toggle("on",resetLearning);
  b.textContent=resetLearning?tr("resetKeyWaiting"):tr("resetKey");
  el("resetKeyHint").innerHTML=resetKey?tr("resetKeyNow",keyLabel(resetKey)):tr("resetKeyNone");
}
function setResetKey(code){
  resetKey=code; resetLearning=false;
  try{ localStorage.setItem("pucktable-reset-key",code); }catch(e){}
  applyResetKey();
}
function doReset(){
  resetHeldAt=0;
  // Wat er getypt is staat al in de markering, maar de opslag kan nog in de
  // wacht staan (zie saveSoon). Die eerst afmaken; anders kost een druk op de
  // knop precies de zin die iemand net intypte.
  if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; }
  save();
  location.reload();
}
addEventListener("keydown",e=>{
  if(resetLearning){
    e.preventDefault();
    if(e.code==="Escape"){ resetLearning=false; applyResetKey(); return; }
    setResetKey(e.code); return;
  }
  if(!resetKey||e.code!==resetKey||e.repeat) return;
  // Een knop die een gewone typetoets stuurt mag niet afgaan terwijl iemand
  // een bijdrage schrijft. Functietoetsen zijn altijd de knop.
  const t=e.target;
  if(!/^F\d+$/.test(e.code) && t && (t.tagName==="INPUT"||t.tagName==="TEXTAREA")) return;
  e.preventDefault();
  if(!resetHeldAt) resetHeldAt=performance.now();
});
addEventListener("keyup",e=>{ if(e.code===resetKey) resetHeldAt=0; });
addEventListener("blur",()=>{ resetHeldAt=0; });
/* Wat er gebeurt terwijl de knop ingedrukt is. Midden op tafel, want daar
   kijkt iedereen naar zodra er iets verandert; twee keer, zodat het aan beide
   kanten rechtop staat. */
function drawResetProgress(ctx,now){
  if(!resetHeldAt) return;
  const p=Math.min(1,(now-resetHeldAt)/CFG.resetHoldMS);
  if(p>=1){ doReset(); return; }
  const r=Math.max(46,CFG.ringPX*0.55), cx=W/2, cy=H/2;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle="rgba(9,12,17,.55)"; ctx.lineWidth=9; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+p*Math.PI*2);
  ctx.strokeStyle="#ffd166"; ctx.lineWidth=7; ctx.lineCap="round"; ctx.stroke();
  const label=tr("resetBusy");
  ctx.font="600 "+CHIP.font.toFixed(1)+"px "+CHIP_FAMILY;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  const h=chipHeight(), w=Math.ceil(ctx.measureText(label).width)+CHIP.padX*2;
  const chip=(y,turn)=>{
    ctx.save(); ctx.translate(cx,y); if(turn) ctx.rotate(Math.PI);
    ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,Math.min(CHIP.radius,h/2));
    ctx.fillStyle="rgba(9,12,17,.92)"; ctx.fill();
    ctx.strokeStyle="rgba(255,209,102,.7)"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle="#ffd166"; ctx.fillText(label,0,0.5);
    ctx.restore();
  };
  chip(cy+r+h,false);
  if(sidesActive()) chip(cy-r-h,true);
  ctx.restore();
}

/* Stille kaart, luide inhoud. Een kaart is verzadigd bedoeld: witte wegen,
   blauw water, groene vlakken. Daar bovenop leggen we vier oordeelskleuren en
   een blauwe knop, en dan vecht de inhoud met zijn eigen ondergrond. Gedempt
   is de kaart weer wat hij hier is — waar iets ligt — en zijn de markeringen
   het enige verzadigde op tafel. Werkt op elk kaartbeeld, ook op een luchtfoto
   en op een offline bewaard beeld, want het zit op het tekenen en niet op de
   bron. */
let calmMap=(()=>{ try{ return localStorage.getItem("pucktable-calm")!=="0"; }catch(e){ return true; } })();
const CALM_FILTER="saturate(.55) contrast(.97) brightness(1.02)";
function applyCalm(){
  el("btnCalm").classList.toggle("on",calmMap);
  el("btnCalm").textContent=calmMap?tr("calmOn"):tr("calm");
  mapRenderKey="";
  try{ localStorage.setItem("pucktable-calm",calmMap?"1":"0"); }catch(e){}
}
function drawMap(g,pad=0){
  /* De kaartlaag is rondom groter dan het zichtbare scherm. Daardoor kan het
     laatst scherpe beeld tijdens een beweging meteen door de compositor
     worden verschoven en geschaald, zonder dat aan de rand een leeg vlak
     verschijnt. De dure tegelopbouw hoeft dan niet meer ieder beeldje. */
  const RW=W+pad*2, RH=H+pad*2, CX=W/2+pad, CY=H/2+pad;
  g.fillStyle=colorTheme==="light"?"#e8edf3":"#0b0e13"; g.fillRect(0,0,RW,RH);
  let drawn=0;
  const rotation=MV.north*Math.PI/180,c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
  const coverW=RW*c+RH*s,coverH=RW*s+RH*c;
  g.save();
  g.translate(CX,CY); g.rotate(rotation); g.translate(-CX,-CY);
  if(calmMap&&"filter" in g) g.filter=CALM_FILTER;

  if(bgImage){
    const nw=MV.projectRaw(bgImage.west,bgImage.north), se=MV.projectRaw(bgImage.east,bgImage.south);
    g.drawImage(bgImage.img, nw.x+pad, nw.y+pad, se.x-nw.x, se.y-nw.y);
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
    const rx=Math.round(tx*ts-centerX+CX), ry=Math.round(ty*ts-centerY+CY);
    const rw=Math.round((tx+1)*ts-centerX+CX)-rx, rh=Math.round((ty+1)*ts-centerY+CY)-ry;
    if(blitCovered(g,z,wrapped,ty,rx,ry,rw,rh)) drawn++;
    else if(!bgImage){ g.strokeStyle=colorTheme==="light"?"rgba(115,129,147,.42)":"rgba(28,35,45,.9)"; g.lineWidth=1; g.strokeRect(rx,ry,rw,rh); }
  }
  if("filter" in g) g.filter="none";
  g.restore();

  if(!drawn && MV.set!=="none"){
    const msg = tilesFailed>0
      ? tr("tileBlocked")
      : tr("tileLoading");
    g.textAlign="center";
    g.fillStyle="rgba(14,18,24,.92)"; g.fillRect(CX-320,pad+22,640,52);
    g.strokeStyle="rgba(255,209,102,.4)"; g.lineWidth=1; g.strokeRect(CX-320,pad+22,640,52);
    g.fillStyle="#ffd166"; g.font="13px 'Space Grotesk',system-ui,sans-serif";
    g.fillText(msg,CX,pad+46);
    g.fillStyle="rgba(127,139,155,.9)"; g.font="12px "+CHIP_FAMILY;
    g.fillText(tr("tilesFoot",tilesTried,tilesFailed),CX,pad+64);
  }
  // scale bar + attribution
  const mPerPx=156543.03392*Math.cos(MV.lat*Math.PI/180)/Math.pow(2,MV.zoom);
  let barM=Math.pow(10,Math.floor(Math.log10(mPerPx*140)));
  if(barM*2/mPerPx<160) barM*=2;
  const barPx=barM/mPerPx;
  g.strokeStyle=colorTheme==="light"?"rgba(23,32,45,.7)":"rgba(232,237,244,.6)"; g.lineWidth=2;
  const barX=pad+88, barY=pad+H;               // rechts van de kaartlagen-knop
  g.beginPath(); g.moveTo(barX,barY-26); g.lineTo(barX+barPx,barY-26);
  g.moveTo(barX,barY-31); g.lineTo(barX,barY-21); g.moveTo(barX+barPx,barY-31); g.lineTo(barX+barPx,barY-21); g.stroke();
  g.fillStyle=colorTheme==="light"?"rgba(23,32,45,.72)":"rgba(232,237,244,.6)"; g.font="11px 'JetBrains Mono',ui-monospace,monospace"; g.textAlign="left";
  g.fillText(barM>=1000?(barM/1000)+" km":barM+" m", barX, barY-36);
  g.textAlign="center"; g.fillStyle=colorTheme==="light"?"rgba(54,68,85,.76)":"rgba(127,139,155,.75)"; g.font="11px "+CHIP_FAMILY;
  g.fillText(TILE_SETS[MV.set]?.credit || "", CX, barY-10);
}

/* ═══════════════════════════════════════════════════════════════
   3. PUCK ENGINE
   ═══════════════════════════════════════════════════════════════ */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
/* De contactpunten van een sjabloon, in millimeters maal `k`: geef `pxPerMM`
   mee voor het scherm, of laat `k` weg voor millimeters op papier. Bij een ring
   liggen ze op de cirkel om het middelpunt; bij een driehoek wordt hij eerst om
   zijn zwaartepunt gelegd, want dát is bij een driehoek het hart van de puck. */
function padsFor(tpl,k=1){
  if(isRing(tpl)){
    const R=tplRing(tpl)*k;
    return [...tpl.angles].map(norm360).sort((a,b)=>a-b)
      .map(a=>({x:R*Math.cos(a*Math.PI/180),y:R*Math.sin(a*Math.PI/180)}));
  }
  const Lm=tplLongest(tpl)*k;
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
/* ── De ringpuck ───────────────────────────────────────────────
   Vijf pootjes op één cirkel. Het middelpunt is níet het zwaartepunt van de
   vijf punten: de pootjes staan met opzet ongelijk verdeeld, dus het zwaarte-
   punt schuift naar de dichtstbezette kant. En het middelpunt is precies waar
   het vizier van de puck ligt, dus dat moet kloppen. Vandaar een echte cirkel-
   passing (Kåsa): een paar sommen en een stelsel van twee onbekenden. */
function fitCircle(pts){
  const n=pts.length; let sx=0,sy=0;
  for(const p of pts){ sx+=p.x; sy+=p.y; }
  const mx=sx/n,my=sy/n;
  let Suu=0,Svv=0,Suv=0,Suuu=0,Svvv=0,Suvv=0,Svuu=0;
  for(const p of pts){
    const u=p.x-mx,v=p.y-my;
    Suu+=u*u; Svv+=v*v; Suv+=u*v;
    Suuu+=u*u*u; Svvv+=v*v*v; Suvv+=u*v*v; Svuu+=v*u*u;
  }
  const det=Suu*Svv-Suv*Suv;
  if(!(Math.abs(det)>1e-6)) return null;            // punten op één lijn
  const b1=(Suuu+Suvv)/2, b2=(Svvv+Svuu)/2;
  const cx=mx+(b1*Svv-b2*Suv)/det, cy=my+(b2*Suu-b1*Suv)/det;
  let sum=0,rmin=Infinity,rmax=0;
  for(const p of pts){
    const d=Math.hypot(p.x-cx,p.y-cy);
    sum+=d; if(d<rmin) rmin=d; if(d>rmax) rmax=d;
  }
  const r=sum/n;
  return r>0?{cx,cy,r,spread:(rmax-rmin)/r}:null;
}
/* Wat de tafel van vijf punten opmaakt: middelpunt, straal, de vijf hoeken met
   de klok mee en de gaten daartussen. `spread` zegt hoe zuiver ze op één cirkel
   liggen — vijf losse vingers halen dat niet. */
function describeRing(pts){
  const fit=fitCircle(pts); if(!fit||fit.r<1) return null;
  const angles=pts.map(p=>norm360(Math.atan2(p.y-fit.cy,p.x-fit.cx)*180/Math.PI))
                  .sort((a,b)=>a-b);
  return {ring:true,cx:fit.cx,cy:fit.cy,radius:fit.r,spread:fit.spread,
          angles,gaps:gapsOf(angles)};
}
const gapErr=(a,b)=>{ let s=0; for(let i=0;i<a.length;i++) s+=Math.abs(a[i]-b[i]); return s/a.length; };
const shift=(a,s)=>a.map((_,i)=>a[(i+s)%a.length]);
/* Past deze meting bij dit sjabloon? De gaten liggen in een kring, dus welk
   pootje "het eerste" is hangt er maar aan hoe de puck ligt: alle vijf de
   verschuivingen worden geprobeerd. De beste geeft meteen welk gemeten punt bij
   welk pootje hoort — en daarmee de hoek van de puck, als gemiddelde van vijf
   verschillen. Dat is veel rustiger dan één hoekpunt van een driehoek, want
   ruis op één pootje weegt nog maar voor een vijfde mee. */
function matchRing(d,tpl){
  const ta=[...tpl.angles].map(norm360).sort((a,b)=>a-b);
  const k=d.angles.length;
  /* Vier gemeten punten mag ook. Een pootje dat een beeldje lang geen contact
     maakt is aan deze tafel eerder regel dan uitzondering — een contactvlak
     van 2 mm is klein. Dan wordt van het sjabloon telkens één pootje weggelaten
     en gekeken welk weglaten past; de gaten van de vier die overblijven rekenen
     zichzelf uit. Bij vijf punten valt er niets weg te laten en is dit precies
     de oude som. */
  const weg = k===5 ? [-1] : ta.map((_,i)=>i);
  let best=null;
  for(const w of weg){
    const sub = w<0 ? ta : ta.filter((_,i)=>i!==w);
    const sg=gapsOf(sub);
    for(let s=0;s<k;s++){
      const err=gapErr(d.gaps,shift(sg,s));
      if(!best||err<best.err) best={err,sub,s};
    }
  }
  let cs=0,sn=0;
  for(let i=0;i<k;i++){
    const off=(d.angles[i]-best.sub[(i+best.s)%k])*Math.PI/180;
    cs+=Math.cos(off); sn+=Math.sin(off);
  }
  // Hoek 0 van een sjabloon is de richtingspijl, dus dit ís de kant die de
  // puck op wijst.
  return {err:best.err,angle:Math.atan2(sn,cs),legs:k};
}
/* Het ringequivalent van een bijna gelijkbenige driehoek: lijkt het patroon op
   zichzelf als je het een pootje verder draait, dan wisselt de voorkant per
   beeldje en loopt het ringmenu vast. Hoe kleiner het getal, hoe erger. */
function ringSelfSym(gaps){
  let m=Infinity;
  for(let s=1;s<gaps.length;s++) m=Math.min(m,gapErr(gaps,shift(gaps,s)));
  return m;
}
const realTouches=new Map();

/* Sommige touchscreens maken geen gewone `click` als er al drie contacten op
   het glas liggen. Dat is precies de normale situatie met een fysieke puck:
   een extra aanraking op een knop of invoerveld leek daardoor niets te doen.
   Voor bediening zetten we alleen in die multitouchsituatie de korte vingertik
   zelf om in een click of focus. De puckcontacten blijven intussen ongemoeid,
   zodat herkennen en ijken gewoon doorlopen. */
const controlTaps=new Map();
const tapControl=t=>t?.closest?.("button,input,textarea,select,label")||null;
/* Het meetvenster telt aanrakingen, ook op zijn eigen knoppen; zie hieronder. */
const inLearnCard=t=>!!t?.closest?.("#learn");
addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"||realTouches.size<3) return;
  const control=tapControl(e.target);
  if(!control||control.disabled) return;
  controlTaps.set(e.pointerId,{control,x:e.clientX,y:e.clientY,t:performance.now()});
  e.preventDefault();
  /* In het meetvenster blijft élke aanraking óók een contactpunt. Een voetje
     van de puck die je erbij legt landt zo maar op een knop van het kaartje, en
     die werd dan als kníkje afgevangen: de tafel zag die puck nooit compleet.
     De tik zelf werkt gewoon door (die synthetiseren we bij pointerup); hij
     wordt alleen niet meer bij de rest weggehouden. */
  if(!inLearnCard(e.target)) e.stopPropagation();
},true);
addEventListener("pointerup",e=>{
  const tap=controlTaps.get(e.pointerId); if(!tap) return;
  controlTaps.delete(e.pointerId);
  e.preventDefault();
  if(!inLearnCard(e.target)) e.stopPropagation();
  const same=tapControl(e.target)===tap.control;
  const short=performance.now()-tap.t<700;
  const still=Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<18;
  if(!same||!short||!still||tap.control.disabled) return;
  if(tap.control.matches('input:not([type="checkbox"]):not([type="radio"]),textarea,select'))
    tap.control.focus({preventScroll:true});
  else tap.control.click();
},true);
addEventListener("pointercancel",e=>controlTaps.delete(e.pointerId),true);

/* One finger drags the map, two fingers pinch it. Three or more is a puck,
   and a recognised puck freezes the map so it can't slide out from under it. */
let gesture=null, mousePan=null;
/* Elke vastgehouden puck heeft zijn eigen greep, zodat twee handen twee pucks
   tegelijk kunnen verplaatsen. */
const puckTouches=[];
const puckTouchByPtr = id => puckTouches.find(t=>t.ptrs.has(id));
const mapMovable = () => !mapLocked && !pinMoveMode && !drag && !learn.open && !puckTouches.length && tracks.size===0 && realTouches.size<3;

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
   one finger slides the puck, two fingers only twist it — the puck stays put. */
function basePuckTouch(pt){
  const p=[...pt.ptrs.values()];
  pt.baseRot=pt.puck.rot;
  if(p.length===1){
    pt.dx=p[0].x-pt.puck.x; pt.dy=p[0].y-pt.puck.y;
  }else{
    pt.baseAngle=Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
  }
}
/* Een vinger die naast de pucks landt hoort bij de greep die er het dichtst bij ligt. */
function nearestPuckTouch(x,y){
  let best=null,bd=Infinity;
  for(const t of puckTouches){
    const d=Math.hypot(t.puck.x-x,t.puck.y-y);
    if(d<bd){ bd=d; best=t; }
  }
  return best;
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
/* ── Scrollen in de bediening ────────────────────────────────────────────
   Aan een tafel ligt er altijd iets op het glas. Zodra er meer dan één
   contactpunt is, ziet de browser geen veeggebaar meer maar een multitouch-
   gebaar, en dan scrollt hij een paneel niet meer: met een puck op tafel stond
   het menu stil onder je vinger. Op een laptop met één vinger werkt het wel,
   dus dit valt pas op de tafel op — en daar is het de enige manier om bij de
   onderkant van een lijst te komen.

   De panelen staan daarom op `touch-action:none` en het scrollen gebeurt hier,
   met de vinger die het begon. `#learn` staat er bewust niet bij: het
   meetvenster moet elke aanraking als contactpunt blijven zien, ook op zijn
   eigen knoppen. */
const uiChrome=t=>t?.closest?.(".panel,#sheet,#analytics,#documentViewer")||null;
function scrollableFrom(node,root){
  for(let n=node; n; n=n.parentElement){
    if(n.scrollHeight>n.clientHeight+2){
      const oy=getComputedStyle(n).overflowY;
      if(oy==="auto"||oy==="scroll") return n;
    }
    if(n===root) break;
  }
  return null;
}
let panelScroll=null;
function startPanelScroll(e,root){
  const target=scrollableFrom(e.target,root);
  if(!target) return;
  // Het paneel staat op `zoom`, dus een schermpixel is niet een pixel in het
  // paneel zelf. De verhouding volgt uit zijn eigen twee maten.
  const scale=target.getBoundingClientRect().height/(target.offsetHeight||1)||1;
  panelScroll={id:e.pointerId,el:target,y:e.clientY,top:target.scrollTop,scale,moved:false};
}
function movePanelScroll(e){
  if(!panelScroll||e.pointerId!==panelScroll.id) return false;
  const dy=e.clientY-panelScroll.y;
  if(!panelScroll.moved&&Math.abs(dy)<5) return true;
  panelScroll.moved=true;
  panelScroll.el.scrollTop=panelScroll.top-dy/panelScroll.scale;
  return true;
}
function endPanelScroll(e){
  if(!panelScroll||e.pointerId!==panelScroll.id) return false;
  // Een veeg is geen tik: de klik die erop volgt mag geen knop indrukken.
  if(panelScroll.moved) panelDragEnd=performance.now();
  panelScroll=null;
  return true;
}
addEventListener("pointerdown",e=>{
  /* Het meetvenster slikt geen enkele aanraking, ook niet op zijn eigen
     knoppen: een puck die half onder het kaartje ligt moet gewoon gelezen
     worden, anders staat er "wachten op drie contactpunten" terwijl hij er
     wel degelijk ligt. Een vinger die op een knop drukt telt zolang mee als
     contactpunt en verdwijnt weer bij loslaten; de kaart staat tijdens het
     meten toch stil (zie `mapMovable`). */
  const chrome=uiChrome(e.target);
  if(chrome){
    // Een vinger in de bediening scrollt zelf; zie startPanelScroll.
    if(e.pointerType!=="mouse") startPanelScroll(e,chrome);
    return;
  }
  if(e.pointerType==="mouse") return;
  if(pinMoveMode){
    e.preventDefault();
    const pin=pinAt(e.clientX,e.clientY);
    if(pin){
      pinDrag={pin,pointerId:e.pointerId,kind:"touch"};
      document.body.classList.add("dragging-dot"); closeNotes();
    }
    gesture=null; return;
  }
  // A finger on a simulated puck grabs it: one finger slides, a second finger twists it
  // to pick a theme without moving it. Een vinger op een ANDERE puck begint een eigen
  // greep — zo verplaats je twee pucks tegelijk. Een vinger naast de pucks doet mee
  // met de dichtstbijzijnde greep.
  {
    const onPuck=simPuckAt(e.clientX,e.clientY);
    let pt = onPuck ? puckTouches.find(t=>t.puck===onPuck)
                    : (puckTouches.length ? nearestPuckTouch(e.clientX,e.clientY) : null);
    if(!pt && onPuck){
      pt={puck:onPuck,ptrs:new Map(),
          t0:performance.now(),px:onPuck.x,py:onPuck.y,rot0:onPuck.rot};
      puckTouches.push(pt);
    }
    if(pt){
      pt.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      basePuckTouch(pt); gesture=null;
      return;
    }
  }
  realTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  syncGesture();
});
addEventListener("pointermove",e=>{
  if(e.pointerType==="mouse") return;
  if(movePanelScroll(e)) return;
  if(pinDrag&&pinDrag.kind==="touch"&&pinDrag.pointerId===e.pointerId){
    movePinTo(pinDrag.pin,e.clientX,e.clientY); return;
  }
  {
    const pt=puckTouchByPtr(e.pointerId);
    if(pt){
      pt.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const p=[...pt.ptrs.values()];
      if(p.length===1){
        setSimPuckPosition(pt.puck,p[0].x-pt.dx,p[0].y-pt.dy);
      }else{
        // Twee vingers draaien alleen: de puck blijft staan waar hij staat.
        const ang=Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
        pt.puck.rot=pt.baseRot+(ang-pt.baseAngle);
      }
      return;
    }
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
    // Ook hier: een verhouding die in één beeldje meer dan een halve
    // zoomstap scheelt komt niet van twee vingers maar van een
    // contactpunt dat verspringt.
    if(gesture.d>16&&d>16)
      MV.zoomBy(Math.max(-0.5,Math.min(0.5,Math.log2(d/gesture.d))),mx,my);
    gesture.d=d; gesture.mx=mx; gesture.my=my;
  }
});
function endPointer(e){
  if(endPanelScroll(e)) return;
  if(pinDrag&&pinDrag.kind==="touch"&&pinDrag.pointerId===e.pointerId){
    movePinTo(pinDrag.pin,e.clientX,e.clientY); pinDrag=null;
    document.body.classList.remove("dragging-dot"); save(); return;
  }
  {
    const pt=puckTouchByPtr(e.pointerId);
    if(pt){
      pt.ptrs.delete(e.pointerId);
      if(pt.ptrs.size===0){
        puckTouches.splice(puckTouches.indexOf(pt),1);
        // Vasthouden en met een tweede vinger een optie aantikken mag ook:
        // die vinger doet mee met de greep, dus hij komt hier terecht.
        if(wasTap(pt)&&!tryPuckHoleTap(e.clientX,e.clientY)) tryPuckMenuTap(e.clientX,e.clientY);
      } else basePuckTouch(pt);
      return;
    }
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
/* De balk blokkeert niets meer: twee mensen met allebei een Probleem-puck is
   een gewone tafel, geen fout. Hij laat alleen zien wat er ligt, met een
   telling zodra het er meer dan één van een soort zijn. */
function markTray(){
  [...document.querySelectorAll(".traypuck")].forEach(d=>
    d.classList.toggle("on-table",simPucks.some(s=>s.tpl.id===d.dataset.id)));
}
/* Deselecteren: take every puck off the table and forget the live tracks.
   Marks that were already dropped stay on the map — only the selection goes.

   `dropTracks` staat standaard aan, maar niet voor een tik op de kaart: die
   mag de sleepkopieën opruimen en verder niets. Een fysieke puck ligt er nog
   steeds; zijn track wissen zet zijn menu, thema en markering terug op nul
   terwijl niemand hem heeft aangeraakt. */
function clearPucks(dropTracks=true){
  if(simPucks.length===0 && (!dropTracks||tracks.size===0)) return;
  simPucks.length=0; puckTouches.length=0; drag=null;
  if(dropTracks){ tracks.clear(); puckMemory.length=0; }
  markTray();
}
/* Eén sleep per vinger. Dit was één variabele, en dan overschreef de tweede
   hand de eerste: die puck landde nooit en zijn sleepkopie bleef als spookje
   op het glas hangen. Aan een tafel grijpen twee mensen tegelijk in de balk. */
const trayDrags=new Map();
let simSeq=0;
function moveGhost(e){
  const d=trayDrags.get(e.pointerId); if(!d) return;
  d.ghost.style.left=(e.clientX/uiScale-27)+"px";
  d.ghost.style.top=(e.clientY/uiScale-27)+"px";
}
function endTrayDrag(e){
  const d=trayDrags.get(e.pointerId); if(!d) return;
  const {tpl,ghost,x0,y0}=d;
  ghost.remove();
  trayDrags.delete(e.pointerId);
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
  // Elke sleepkopie krijgt een eigen nummer. De soort zegt niet meer wie hij
  // is -- er mogen er twee van dezelfde liggen -- maar de herkenning moet de
  // contactpunten van twee pucks wel uit elkaar kunnen houden.
  simPucks.push({tpl,uid:++simSeq,x,y,lng:ll.lng,lat:ll.lat,rot:Math.random()*Math.PI*2});
  markTray();
}
trays().forEach(t=>t.addEventListener("pointerdown",onTrayDown));
function onTrayDown(e){
  const node=e.target.closest(".traypuck");
  if(!node) return;
  const tpl=templates.find(t=>t.id===node.dataset.id);
  if(!tpl) return;
  e.preventDefault();
  const ghost=node.cloneNode(true);
  ghost.style.cssText="position:fixed;z-index:60;margin:0;pointer-events:none;opacity:.9;zoom:"+uiScale;
  document.body.appendChild(ghost);
  trayDrags.set(e.pointerId,{tpl,ghost,node,x0:e.clientX,y0:e.clientY});
  moveGhost(e);
}
/* Luister op het venster: sommige touchscreens sturen het loslaten naar het
   canvas zodra de vinger de puck-balk verlaat. Dan bleef voorheen alleen de
   sleepkopie hangen en werd er geen puck geplaatst. Eén keer aangemeld, want
   er kunnen meer slepen tegelijk lopen. */
addEventListener("pointermove",moveGhost);
addEventListener("pointerup",endTrayDrag);
addEventListener("pointercancel",endTrayDrag);

function simPads(){
  const out=[];
  for(const s of simPucks) for(const p of padsFor(s.tpl,pxPerMM)){
    const c=Math.cos(s.rot),si=Math.sin(s.rot);
    out.push({x:s.x+p.x*c-p.y*si,y:s.y+p.x*si+p.y*c,sim:true,uid:s.uid});
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
    if(drag?.puck===s||puckTouches.some(t=>t.puck===s)) continue;
    const p=MV.project(s.lng,s.lat), dx=p.x-s.x, dy=p.y-s.y;
    if(Math.abs(dx)<0.001&&Math.abs(dy)<0.001) continue;
    s.x=p.x; s.y=p.y;
    const t=trackForSim(s);
    if(t){
      t.x+=dx; t.y+=dy; t.anchorX+=dx; t.anchorY+=dy;
      // Ook het ijkpunt van het schuiven gaat mee: een sleepkopie die met de
      // kaart onder zich mee reist heeft niemand verduwd, en mag de kaart dus
      // ook niet verder wegduwen. Anders jaagt de ene puck de andere op hol.
      if(t.panOX!=null){ t.panOX+=dx; t.panOY+=dy; }
      t.buf=t.buf.map(q=>({x:q.x+dx,y:q.y+dy}));
    }
  }
}
let drag=null;
addEventListener("mousedown",e=>{
  if(e.target.closest(".panel")||e.target.closest("#sheet")||e.target.closest("#learn")) return;
  if(pinMoveMode){
    e.preventDefault();
    const pin=pinAt(e.clientX,e.clientY);
    if(pin){pinDrag={pin,kind:"mouse"};document.body.classList.add("dragging-dot");closeNotes();}
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
  if(drag && wasTap(drag)) tryPuckHoleTap(e.clientX,e.clientY);
  drag=null; mousePan=null;
});
addEventListener("wheel",e=>{
  if(pinMoveMode){e.preventDefault();return;}
  const hit=simPuckAt(e.clientX,e.clientY);
  if(hit){ e.preventDefault(); hit.rot+=e.deltaY*0.002; return; }
  // Wat bediening is, scrollt; alleen de kaart zelf zoomt.
  if(uiChrome(e.target)) return;
  if(!mapLocked){
    e.preventDefault();
    // normalise the wheel across mice (pixels), trackpads (many small pixels) and Firefox (lines/pages)
    const unit=e.deltaMode===1?16:e.deltaMode===2?H:1;
    const dz=Math.max(-0.6,Math.min(0.6,-e.deltaY*unit/220));
    MV.zoomBy(dz,e.clientX,e.clientY);
  }
},{passive:false});

/* De drievoudige lus liep over álle contactpunten. Aan een tafel met publiek
   liggen er bij een druk gesprek makkelijk twintig vingers en een handpalm op
   het glas: bij 24 punten zijn dat ruim tweeduizend combinaties per beeld, en
   dat precies op het moment dat de tafel het hardst nodig is — waarop mensen
   reageren door nóg meer aan te raken.

   De punten gaan daarom eerst in een raster met cellen ter grootte van de
   langste puckzijde. Drie punten die verder dan één cel uit elkaar liggen
   kunnen nooit één puck zijn, dus alleen de eigen cel en zijn acht buren
   hoeven bekeken te worden. De uitkomst is dezelfde; alleen het werk niet. */
/* `tpls` is normaal de hele lijst. Het meetvenster geeft er een kortere mee:
   alleen de pucks die de tafel al gemeten heeft, om die van het glas te kunnen
   aftrekken (zie `learnPoints`). */
/* Alle vijftallen uit een handjevol punten, oplopend gesorteerd zodat de
   sleutel in `recognise` altijd dezelfde is. Bij vijf punten is dat er één, bij
   zeven eenentwintig — meer worden het er nooit. */
function pick5(idx){
  const a=[...idx].sort((x,y)=>x-y);
  if(a.length===5) return [a];
  const out=[],cur=[];
  (function walk(start){
    if(cur.length===5){ out.push([...cur]); return; }
    for(let i=start;i<a.length;i++){ cur.push(a[i]); walk(i+1); cur.pop(); }
  })(0);
  return out;
}
// De vijf viertallen uit een vijftal: welk pootje ontbreekt.
function pick4(a){ return a.map((_,i)=>a.filter((_,j)=>j!==i)); }
/* ── Wat de tafel van een puck ziet ────────────────────────────
   "De pucks worden slecht herkend" kan van alles zijn: de tafel ziet de
   pootjes niet, hij ziet ze wel maar op de verkeerde maat, of hij twijfelt
   tussen twee pucks. Dat verschil is aan de tafel niet te zien en op afstand
   niet te raden — vandaar dat de herkenning haar eigen tussenstand bewaart en
   `drawPuckDiag` die naast de puck zet. Alleen als de touch-debug aan staat;
   anders wordt er niets bijgehouden. */
let ringDiag=null;
function noteRingDiag(d,gemeten){
  if(!debugMode||!gemeten.length) return;
  if(ringDiag&&ringDiag.err<=gemeten[0].m.err) return;
  ringDiag={err:gemeten[0].m.err, legs:d.angles.length,
            mm:d.radius/pxPerMM, spread:d.spread,
            lijst:gemeten.map(g=>({naam:g.tpl.name||g.tpl.id, err:g.m.err}))};
}
function recognise(points,tpls){
  if(debugMode) ringDiag=null;
  const list=tpls||activeTemplates();
  /* Twee soorten pucks, twee zoektochten over dezelfde punten: driehoeken uit
     drietallen, ringen uit vijftallen op één cirkel. Ze komen daarna in dezelfde
     bak kandidaten en strijden om dezelfde contactpunten. */
  const tris=list.filter(t=>!isRing(t)), rings=list.filter(isRing);
  const cands=[],maxSpan=maxTplSpan()*pxPerMM*1.45;
  // Welke soorten er al liggen: die krijgen wat meer speelruimte (zie hieronder).
  const onTable=new Set([...tracks.values()].map(t=>t.tpl.id));
  const cell=Math.max(24,maxSpan), grid=new Map();
  for(let i=0;i<points.length;i++){
    const key=Math.floor(points[i].x/cell)+":"+Math.floor(points[i].y/cell);
    let bucket=grid.get(key); if(!bucket) grid.set(key,bucket=[]);
    bucket.push(i);
  }
  for(let i=0;i<points.length;i++){
    const cx=Math.floor(points[i].x/cell), cy=Math.floor(points[i].y/cell);
    const near=[];
    for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){
      const bucket=grid.get((cx+dx)+":"+(cy+dy)); if(!bucket) continue;
      for(const j of bucket) if(j>i) near.push(j);
    }
    near.sort((a,b)=>a-b);
    for(let a=0;a<near.length;a++){
    const j=near[a];
    if(dist(points[i],points[j])>maxSpan) continue;
    for(let b=a+1;b<near.length;b++){
      const k=near[b];
      if(dist(points[i],points[k])>maxSpan||dist(points[j],points[k])>maxSpan) continue;
      /* Een sleepkopie draagt zijn eigen nummer. Punten van twee verschillende
         pucks vormen samen nooit een puck, dus die driehoek slaan we over --
         anders pikt zo'n spookdriehoek een contactpunt van een echte puck weg. */
      const uid=points[i].uid??points[j].uid??points[k].uid;
      if(uid!==undefined&&(points[i].uid!==uid||points[j].uid!==uid||points[k].uid!==uid)) continue;
      const d=describe(points[i],points[j],points[k]); if(!d) continue;
      for(const tpl of tris){
        const err=Math.hypot(d.ratios[0]-tpl.ratios[0],d.ratios[1]-tpl.ratios[1]);
        /* Tijdens draaien vervormen de gemeten contactpunten enkele pixels.
           Een puck die al gevolgd wordt krijgt daarom wat extra speelruimte;
           de eerste herkenning blijft op de ingestelde, strenge tolerantie. */
        const tracked=onTable.has(tpl.id);
        const errLimit=tracked?Math.min(0.14,tolerance*1.4):tolerance;
        if(err>errLimit) continue;
        const want=tplLongest(tpl)*pxPerMM;
        const sizeErr=Math.abs(d.longest-want)/want;
        if(sizeErr>(tracked?0.50:0.42)) continue;
        cands.push({tpl,errN:err/errLimit,idx:[i,j,k],d,conf:Math.max(0,1-err/errLimit*0.7-sizeErr*0.6)});
      }
    }
    }
  }
  /* De ringen. Drie punten leggen precies één cirkel vast, dus voor elk drietal
     rond een punt wordt die cirkel gepast; ligt de straal in het bereik van de
     sjablonen, dan worden de punten opgehaald die óók op die cirkel liggen.
     Zijn dat er vijf, dan is dat een kandidaat.

     Alle vijftallen langsgaan zou aan een tafel met twintig vingers ondoenlijk
     zijn (bij 24 punten ruim 40.000 per beeldje); via de cirkel blijft het bij
     een handvol per punt. Het zoekpunt zelf zit altijd in het drietal: elke ring
     bevat zijn eigen laagste punt, en de andere vier liggen binnen één diameter
     daarvan, dus er gaat niets verloren. */
  if(rings.length){
    const rMin=Math.min(...rings.map(tplRing))*pxPerMM*0.72;
    const rMax=Math.max(...rings.map(tplRing))*pxPerMM*1.30;
    const seen=new Set(), reach=2*rMax*1.12;
    for(let i=0;i<points.length;i++){
      const cx=Math.floor(points[i].x/cell), cy=Math.floor(points[i].y/cell);
      const nb=[];
      for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){
        const bucket=grid.get((cx+dx)+":"+(cy+dy)); if(!bucket) continue;
        for(const j of bucket) if(j!==i&&dist(points[i],points[j])<=reach) nb.push(j);
      }
      if(nb.length<4) continue;
      /* Bij veel vingers op het glas kijken we alleen naar de elf dichtstbij-
         zijnde punten: de pootjes van dezelfde puck liggen altijd dichterbij
         dan de rest van de tafel. */
      nb.sort((a,b)=>dist(points[i],points[a])-dist(points[i],points[b]));
      const near=nb.slice(0,11);
      for(let a=0;a<near.length;a++) for(let b=a+1;b<near.length;b++){
        const fit=fitCircle([points[i],points[near[a]],points[near[b]]]);
        if(!fit||fit.r<rMin||fit.r>rMax) continue;
        let on=[i,...near].filter(k=>
          Math.abs(Math.hypot(points[k].x-fit.cx,points[k].y-fit.cy)-fit.r)<fit.r*0.16);
        if(on.length<5) continue;
        /* Er kan een losse vinger op dezelfde cirkel liggen — een hand die naast
           de puck rust doet dat zo. Dan zijn het er zes of zeven, en wordt elk
           vijftal daaruit geprobeerd; de puck raakt dus niet zoek doordat er
           iemand naast hem op het glas leunt. Meer dan zeven punten op één
           cirkel is geen puck meer, dan blijven de zeven zuiverste over. */
        if(on.length>7) on=on.sort((a,b)=>
          Math.abs(Math.hypot(points[a].x-fit.cx,points[a].y-fit.cy)-fit.r)-
          Math.abs(Math.hypot(points[b].x-fit.cx,points[b].y-fit.cy)-fit.r)).slice(0,7);
        for(const groep of pick5(on)){
          /* Dezelfde regel als bij de driehoeken: punten van twee sleepkopieën
             vormen samen nooit één puck. */
          const uid=groep.map(k=>points[k].uid).find(u=>u!==undefined);
          if(uid!==undefined&&groep.some(k=>points[k].uid!==uid)) continue;
          // Hetzelfde vijftal wordt vanuit elk van zijn punten gevonden; de
          // sleutel moet dus niet aan de volgorde hangen.
          const key=groep.join(","); if(seen.has(key)) continue; seen.add(key);
          const d=describeRing(groep.map(k=>points[k]));
          if(!d||d.spread>0.16) continue;
          /* Één vijftal is één puck, geen vier kandidaten. Eerder mocht elk
             sjabloon dat binnen de grens viel meedoen, en bij ruis op de
             pootjes kwam de verkeerde er dan soms als eerste uit. Dat is niet
             alleen een verkeerd label: een detectie met een ander sjabloon
             hoort nooit bij de bestaande track (zie `track`), dus de puck
             knipperde weg en kwam als een andere puck terug. Nu wordt alleen
             de best passende voorgedragen, en alleen als hij `ringMarginDeg`
             beter past dan de nummer twee. Zit het dichter op elkaar, dan is
             het een dubbelzinnige meting en zegt de tafel liever niets. */
          const gemeten=rings.map(tpl=>({tpl,m:matchRing(d,tpl)}))
                             .sort((a,b)=>a.m.err-b.m.err);
          noteRingDiag(d,gemeten);
          const win=gemeten[0], tweede=gemeten[1];
          if(!win) continue;
          if(tweede&&tweede.m.err-win.m.err<CFG.ringMarginDeg) continue;
          {
            const tpl=win.tpl, m=win.m, tracked=onTable.has(tpl.id);
            const limit=CFG.ringToleranceDeg*(tracked?1.25:1);
            if(m.err>limit) continue;
            const want=tplRing(tpl)*pxPerMM;
            const sizeErr=Math.abs(d.radius-want)/want;
            if(sizeErr>(tracked?0.30:0.22)) continue;
            cands.push({tpl,errN:m.err/limit,idx:groep.slice(),d:{...d,angle:m.angle},
                        conf:Math.max(0,1-m.err/limit*0.7-sizeErr*0.6)});
          }
        }
      }
    }
  }
  /* Hetzelfde sjabloon mag meerdere keren gekozen worden: twee mensen met
     allebei een Probleem-puck is een gewone tafel. Wat een kandidaat nog wél
     uitsluit:

       - contactpunten die al bij een andere puck horen;
       - een zwaartepunt binnen `puckSepPX()` van een al gekozen puck. Twee
         schijven kunnen niet op elkaar liggen, dus zo'n driehoek loopt dwars
         over twee pucks heen en is een spook.

     De volgorde weegt bovendien mee wie er al lag: een kandidaat die een puck
     voortzet wint van een spookdriehoek met een net iets kleinere fout. Zonder
     dat wisselde bij twee pucks naast elkaar per beeldje welke van de twee
     "de beste" was en knipperden ze om beurten weg. */
  const sep=puckSepPX();
  const continues=c=>[...tracks.values()].some(t=>t.tpl.id===c.tpl.id&&
        Math.hypot(t.x-c.d.cx,t.y-c.d.cy)<sep);
  /* De fout van een driehoek is een verhouding en die van een ring staat in
     graden. Ze zijn daarom allebei op hun eigen tolerantie gedeeld (`errN`:
     0 is precies, 1 is net binnen), zodat ze eerlijk om dezelfde punten
     strijden. Een halve tolerantie voorsprong voor wie een puck voortzet. */
  for(const c of cands) c.score=c.errN-(continues(c)?0.5:0);
  cands.sort((a,b)=>a.score-b.score);
  const used=new Set(),out=[];
  for(const c of cands){
    if(c.idx.some(i=>used.has(i))) continue;
    if(out.some(o=>Math.hypot(o.x-c.d.cx,o.y-c.d.cy)<sep)) continue;
    c.idx.forEach(i=>used.add(i));
    out.push({tpl:c.tpl,conf:c.conf,x:c.d.cx,y:c.d.cy,
              angle:c.d.ring?c.d.angle
                             :Math.atan2(c.d.anchor.y-c.d.cy,c.d.anchor.x-c.d.cx)});
  }
  /* ── Vasthouden op vier pootjes ───────────────────────────────
     Een puck die al op tafel ligt hoeft niet elk beeldje opnieuw bewezen te
     worden. Verliest één pootje even contact, dan liggen de vier andere nog
     keurig op zijn cirkel; die worden hier tegen zijn éigen sjabloon gelegd,
     op zijn eigen plek. Zo blijft de puck staan in plaats van te knipperen, en
     omdat er maar één sjabloon meedoet kan hij daarbij niet van identiteit
     wisselen. Voor een puck die er nog niet lag gebeurt dit niet: vier punten
     zeggen te weinig om een nieuwe puck mee te openen. */
  // Niet tijdens het meten: dat venster geeft een eigen, korter lijstje
  // sjablonen mee en wil alleen ingelezen pucks van het glas aftrekken.
  for(const t of (tpls?[]:tracks.values())){
    if(!isRing(t.tpl)) continue;
    if(out.some(o=>Math.hypot(o.x-t.x,o.y-t.y)<sep)) continue;
    const want=tplRing(t.tpl)*pxPerMM, bij=[];
    for(let i=0;i<points.length;i++){
      if(used.has(i)) continue;
      const r=Math.hypot(points[i].x-t.x,points[i].y-t.y);
      if(r>=want*0.55&&r<=want*1.45) bij.push(i);
    }
    if(bij.length<4) continue;
    // De punten die het dichtst bij zijn cirkel liggen gaan voor.
    const afw=i=>Math.abs(Math.hypot(points[i].x-t.x,points[i].y-t.y)-want);
    bij.sort((a,b)=>afw(a)-afw(b));
    const groep=bij.slice(0,5);
    const proberen=groep.length===5?[groep,...pick4(groep)]:[groep];
    for(const g of proberen){
      const d=describeRing(g.map(k=>points[k]));
      if(!d||d.spread>0.20) continue;
      if(Math.abs(d.radius-want)/want>0.30) continue;
      if(Math.hypot(d.cx-t.x,d.cy-t.y)>sep) continue;
      const m=matchRing(d,t.tpl);
      if(m.err>CFG.ringHoldDeg) continue;
      g.forEach(i=>used.add(i));
      out.push({tpl:t.tpl,conf:0.4,x:d.cx,y:d.cy,angle:m.angle,held:true});
      break;
    }
  }
  return {pucks:out,usedIdx:used};
}
/* Een luikje voor de rooktest. Met `?test` in de URL staan de rekenstukjes van
   de herkenning even op `window`: zo kan de test vijf punten aanbieden en
   nakijken welke puck eruit komt en onder welke hoek, zonder tafel en zonder
   glas. Zonder `?test` bestaat het niet, dus er valt aan een echte tafel niets
   mee te doen. */
if(QS.has("test")) window.__puck={describeRing,matchRing,recognise,padsFor,gapsOf,
                                  templates:()=>templates,pxPerMM:()=>pxPerMM,
                                  // Voor de rooktest: waar een optie op de ring ligt.
                                  topics:()=>topics(),ringStart:n=>ringStart(n),
                                  ringPX:()=>CFG.ringPX,
                                  // En of de themaring van een puck openstaat.
                                  ringOpen:()=>[...tracks.values()].map(t=>!!t.ring),
                                  // En waar de kaart staat, zodat de test kan
                                  // nakijken dat draaien zoomt en duwen reist.
                                  view:()=>({zoom:MV.zoom,lng:MV.lng,lat:MV.lat}),
                                  // En wat er nu op tafel ligt, zodat de test kan zien
                                  // of een puck blijft staan als er een pootje wegvalt.
                                  tracks:()=>[...tracks.values()].map(t=>({id:t.tpl.id,
                                    x:t.x,y:t.y,state:t.state,angle:t.angle}))};

/* Hoe dicht twee pucks bij elkaar kunnen liggen. Een puck is een schijf, dus
   twee middelpunten liggen nooit dichter bij elkaar dan zijn breedte; deze maat
   houdt daar ruim afstand van en dient twee doelen: kandidaten die te dicht op
   een gekozen puck liggen afwijzen, en een detectie aan de juiste puck van
   dezelfde soort koppelen. */
const puckSepPX=()=>CFG.puckRadiusMM*pxPerMM*0.9;
/* Pucks worden bijgehouden op een eigen volgnummer, niet op hun soort. Dat
   was eerst hetzelfde: één puck per sjabloon. Maar dan kan er nooit een tweede
   Probleem-puck op tafel, en dat is precies wat een tafel met twee groepen
   nodig heeft. Wie welke is, volgt nu uit waar hij ligt (zie `track`). */
const tracks=new Map();
let trackSeq=0;
/* De stand van pucks die net van de tafel vielen, hooguit `CFG.puckMemoryMS`
   oud. Een lijst, want de soort is geen sleutel meer: er kunnen er twee van
   dezelfde in staan. Zie de uitleg bij het opruimen van tracks, onderaan
   `track()`. */
const puckMemory=[];
/* Bij een sleepkopie hoort de track die er het dichtst bij ligt en dezelfde
   soort heeft; met twee pucks van één soort zegt het sjabloon niet meer welke. */
function trackForSim(s){
  let best=null,bd=puckSepPX();
  for(const t of tracks.values()){
    if(t.tpl.id!==s.tpl.id) continue;
    const d=Math.hypot(t.x-s.x,t.y-s.y);
    if(d<bd){ bd=d; best=t; }
  }
  return best;
}
function startTrack(d,now){
  const t={id:"puck-"+(++trackSeq),tpl:d.tpl,x:d.x,y:d.y,angle:d.angle,
           measuredAngle:d.angle,filteredAngle:d.angle,lastRawAngle:d.angle,
           angleOrigin:d.angle,rawOrigin:d.angle,
           frames:0,state:"candidate",buf:[],
           conf:d.conf,anchorX:d.x,anchorY:d.y,armed:true,flash:0,
           // Om een liggende puck staat niets: de thema's komen pas als je
           // het kijkgat aantikt (`ring`). `tapIdx`/`tapT0` houden het
           // oplichten van de laatst aangetikte optie bij.
           ring:false,topicIdx:0,tapIdx:-1,tapT0:0,
           // Waar hij ging liggen is het ijkpunt van het schuiven, en de hoek
           // waaronder hij ging liggen is het nulpunt van het zoomen.
           panOX:d.x,panOY:d.y,panT:0,zoomRot:d.angle,zoomCarry:0};
  tracks.set(t.id,t);
  // Kwam dezelfde puck net van de tafel? Dan is dit geen nieuwe puck maar
  // dezelfde die even wegviel: hij pakt zijn stand weer op en kiest dus niet
  // opnieuw. Dezelfde soort én ongeveer dezelfde plek, want de soort alleen
  // zou de stand van de ene puck aan de andere kunnen geven.
  const mi=puckMemory.findIndex(m=>m.tplId===d.tpl.id&&now-m.t<CFG.puckMemoryMS&&
                                   Math.hypot(m.x-d.x,m.y-d.y)<puckSepPX()*1.6);
  if(mi>=0){
    const mem=puckMemory.splice(mi,1)[0];
    t.ring=mem.ring; t.topicIdx=mem.topicIdx;
    t.pinId=mem.pinId; t.armed=mem.armed;
    t.angleOrigin=mem.angleOrigin; t.angle=mem.angleOrigin;
    t.zoomRot=mem.angleOrigin;
    // Het ijkpunt van het schuiven hoort bij de plek op tafel: een puck die
    // even wegviel en terugkomt ligt er nog net zo scheef bij als daarvoor.
    t.panOX=mem.panOX; t.panOY=mem.panOY;
  }
  return t;
}
/* Welke detectie hoort bij welke puck die er al lag? Niet op sjabloon -- twee
   pucks kunnen dezelfde soort hebben -- maar op plek: het dichtstbijzijnde paar
   eerst, en nooit verder dan `puckSepPX()`. Die maat ligt ruim onder de
   afstand tussen twee schijven, dus twee gelijke pucks wisselen niet stiekem
   van identiteit (en daarmee van thema en markering). */
function track(dets,now){
  const forDet=new Map(), taken=new Set();
  const koppel=(reach,zelfdeSoort=true)=>{
    const pairs=[];
    for(const d of dets){
      if(forDet.has(d)) continue;
      for(const t of tracks.values()){
        if(taken.has(t)||(zelfdeSoort&&t.tpl.id!==d.tpl.id)) continue;
        const gap=Math.hypot(t.x-d.x,t.y-d.y);
        if(gap<=reach) pairs.push({d,t,gap});
      }
    }
    pairs.sort((a,b)=>a.gap-b.gap);
    for(const p of pairs){
      if(forDet.has(p.d)||taken.has(p.t)) continue;
      forDet.set(p.d,p.t); taken.add(p.t);
    }
  };
  koppel(puckSepPX());
  /* Een echte puck kan door één slecht contactbeeld kort als een ander
     sjabloon worden gelezen. Alleen op soort koppelen maakte dan op vrijwel
     dezelfde plek een tweede track, terwijl de oude nog 0,9 s zichtbaar
     bleef. Twee fysieke schijven kunnen nooit met hun middelpunten zo dicht
     bij elkaar liggen, dus deze zeer krappe ronde mag de soort negeren. Hij
     komt vóór de ruime ronde, zodat een verkeerde soort niet naar een verder
     weg liggende puck van toevallig diezelfde soort springt. */
  koppel(puckSepPX()*0.55,false);
  /* Laatste ronde, ruimer. Wie een puck met een zwaai over de tafel schuift
     legt in één beeldje meer af dan de eerste ronde toestaat; die zou dan als
     nieuwe puck binnenkomen en zijn markering en thema kwijt zijn. De krappe
     rondes hebben de voor de hand liggende paren dan al vergeven, dus twee
     pucks van dezelfde soort kunnen hier niet meer van identiteit wisselen. */
  koppel(puckSepPX()*2.5);
  const seen=new Set();
  for(const d of dets){
    const t=forDet.get(d)||startTrack(d,now);
    seen.add(t);
    const zelfdeSoort=t.tpl.id===d.tpl.id;
    if(!zelfdeSoort){
      if(t.tplMismatchId===d.tpl.id) t.tplMismatchFrames=(t.tplMismatchFrames||0)+1;
      else{ t.tplMismatchId=d.tpl.id; t.tplMismatchFrames=1; }
      /* Pas na zes opeenvolgende beelden is dit echt een andere puck die op
         dezelfde plek is neergelegd. Tot die tijd houden we de bestaande
         identiteit én hoek vast: een verkeerde hoek mag ook niet zoomen. */
      if(t.tplMismatchFrames>=6){
        t.tpl=d.tpl; t.tplMismatchId=null; t.tplMismatchFrames=0;
        t.angleOrigin=d.angle; t.rawOrigin=d.angle;
        t.measuredAngle=d.angle; t.filteredAngle=d.angle;
        t.lastRawAngle=d.angle; t.angle=d.angle; t.zoomRot=d.angle; t.zoomCarry=0;
        t.ring=false; t.topicIdx=0; t.pinId=null; t.armed=true;
      }
    }else{
      t.tplMismatchId=null; t.tplMismatchFrames=0;
    }
    t.frames++; t.lastSeen=now; t.conf=t.conf*.7+d.conf*.3;
    t.buf.push({x:d.x,y:d.y}); if(t.buf.length>CFG.smoothing) t.buf.shift();
    t.x=t.buf.reduce((s,p)=>s+p.x,0)/t.buf.length;
    t.y=t.buf.reduce((s,p)=>s+p.y,0)/t.buf.length;
    /* Een eenmalige soortfout houdt ook de laatst betrouwbare hoek vast. */
    const measured=t.tpl.id===d.tpl.id?d.angle:t.lastRawAngle;
    let rawStep=measured-t.lastRawAngle;
    while(rawStep>Math.PI) rawStep-=Math.PI*2;
    while(rawStep<-Math.PI) rawStep+=Math.PI*2;
    t.lastRawAngle=measured;
    t.measuredAngle+=rawStep;
    t.filteredAngle+=(t.measuredAngle-t.filteredAngle)*0.55;
    // De hoek stuurde de keuzering aan en stond daarom versterkt: één graad
    // aan de puck was er twee op de ring. Nu je kiest door te tikken hoeft hij
    // niets meer te sturen — dit is weer gewoon de gemeten stand van de puck,
    // gedempt tegen de trilling van de contactpunten.
    t.angle=t.angleOrigin+(t.filteredAngle-t.rawOrigin);
    t.state=t.frames>=CFG.stableFrames?"recognised":"candidate";
    const moved=Math.hypot(t.x-t.anchorX,t.y-t.anchorY);
    if(moved>CFG.jitterPX){ t.anchorX=t.x; t.anchorY=t.y; }
    // Een puck die duidelijk verplaatst wordt, wordt een nieuwe bijdrage: opnieuw
    // een thema draaien en opnieuw bevestigen. De vorige markering blijft staan.
    if(moved>CFG.rearmPX && !t.armed){ t.armed=true; t.pinId=null; }
    // Draaien zoomt, schuiven pant. Kiezen gaat met een tik in het kijkgat en
    // daarna op de ring (zie `tryPuckHoleTap` en `tryPuckMenuTap`).
    applyPuckControls(t,now);
  }
  for(const [id,t] of [...tracks]){
    if(seen.has(t)) continue;
    if(now-t.lastSeen>CFG.dropoutMS){
      // Een puck die wegvalt is bijna nooit een puck die weggehaald wordt: één
      // slecht contact, een stoot tegen de tafel, een mouw over het glas. Zijn
      // stand gaat daarom kort in de wacht in plaats van meteen weg. Anders
      // komt hij terug als verse puck, kiest hij meteen de stand waar zijn
      // neus toevallig op staat, en is hij zijn markering kwijt.
      while(puckMemory.length&&now-puckMemory[0].t>=CFG.puckMemoryMS) puckMemory.shift();
      puckMemory.push({tplId:t.tpl.id,x:t.x,y:t.y,t:now,
                       ring:t.ring,topicIdx:t.topicIdx,
                       pinId:t.pinId,armed:t.armed,angleOrigin:t.angle,
                       panOX:t.panOX,panOY:t.panOY});
      tracks.delete(id);
    }
    /* Een puck die al herkend wás blijft staan tot `dropoutMS` om is — daar
       is die wachttijd voor. Dit stond er als één stap: het eerste gemiste
       beeldje zette hem op "incomplete", en het tweede kwam hier langs, zag
       geen "recognised" meer en gooide hem weg. Een puck overleefde dus één
       beeldje in plaats van 0,9 seconde, en van de hele dropout-regeling bleef
       niets over. Alleen een kandidaat die nooit bevestigd is mag meteen weg. */
    else if(t.state==="recognised"||t.state==="incomplete") t.state="incomplete";
    else tracks.delete(id);
  }
  return [...tracks.values()].filter(t=>t.state!=="candidate");
}

/* ═══════════════════════════════════════════════════════════════
   4. PINS
   ═══════════════════════════════════════════════════════════════ */
/* ── De puck bedient de kaart ─────────────────────────────────────────────
   Een puck heeft op het glas twee vrijheidsgraden, en die zijn allebei
   rechtstreeks de kaart geworden:

     draaien    zoomen om de plek onder het kijkgat (met de klok mee is in)
     schuiven   de kaart die kant op reizen
     kijkgat    de thema's erbij halen

   Er is geen stand meer om eerst te kiezen. Dat scheelt een heel niveau: de
   ring had Verplaatsen · Zoomen · Kiezen, je moest weten waar je puck in
   stond, en zoomen deed je door de puck vooruit te duwen — dezelfde beweging
   als verplaatsen, met een andere betekenis. Nu doet de kaart wat je met de
   puck doet, zonder stand ertussen.

   Van de ring blijft de themalijst over, en die staat er alleen als je erom
   vraagt: een tik in het kijkgat haalt hem tevoorschijn, een tik op een thema
   legt de markering vast (of zet het thema van de markering die er al ligt om)
   en laat hem weer verdwijnen. Zo ligt er om een liggende puck niets over de
   kaart heen en kun je hem rustig verschuiven zonder een optie te raken. */
/* De ring begint bovenaan. Het eerste segment ligt met zijn midden op twaalf
   uur, en de rest volgt met de klok mee. Zonder die draaiing begon segment 0
   linksboven, en dan wijst "de eerste optie" nergens naar — aan een tafel is
   boven de enige stand die iedereen hetzelfde leest. De verschuiving hangt af
   van het aantal opties (een halve segmentbreedte minus een kwartslag), zodat
   het ook klopt voor de themalijst, die er meer heeft dan vier. */
const ringOffset=n=>Math.PI/2-Math.PI/n;
const ringStart=n=>-Math.PI+ringOffset(n);
const ringIndexOf=(angle,n)=>{
  if(!n) return 0;
  let a=(angle-ringStart(n))/(Math.PI*2); a=(a%1+1)%1;
  return Math.floor(a*n)%n;
};

/* Wat er op de ring staat: de thema's en `Terug`. Eén niveau, dus dit hangt
   niet meer van een menustand af. */
function ringItems(t){
  return topics().map(name=>({key:"topic",label:name}))
                 .concat([{key:"back",label:tr("puckBack")}]);
}
/* Welke optie als gekozen geldt: het thema van deze puck. */
function ringChosen(t){ return t.topicIdx; }
const puckTopic=t=>{ const list=topics(); return list[(t.topicIdx||0)%list.length]||list[0]; };

/* Een keuze uit de ring uitvoeren. Alleen hier verandert de stand van een
   puck, zodat er één plek is om na te lezen wat een optie doet. */
function commitPuckChoice(t,idx){
  const items=ringItems(t), item=items[idx];
  if(!item||item.disabled) return;
  if(item.key==="topic"){
    t.topicIdx=idx;
    /* Het thema aantikken is meteen het vastleggen. Er was eerst nog een tik
       in het kijkgat voor nodig, maar dat is een tweede handeling voor een
       keuze die al gemaakt is: wie een thema aanwijst, wil die markering.
       Ligt de markering er al, dan zet dezelfde tik alleen het thema om en
       komt zijn venster weer terug. */
    if(t.armed) dropPin(t);
    else{
      syncPlacedPinTopic(t);
      const pin=t.pinId?pins.find(p=>p.id===t.pinId):null;
      if(pin) openNote(pin,t.x,t.y,true);
    }
  }
  // Gekozen of niet ("Terug"): de ring heeft zijn werk gedaan en gaat dicht.
  t.ring=false;
}

/* Waar de ring ophoudt: net voorbij de labelchip. Het venster van een puck
   wordt op dezelfde maat weggehouden (`puckReach`), zodat een open venster
   nooit over een optie heen ligt die je moet kunnen raken — ook als de ring
   dicht staat, want hij kan elk moment opengaan en een venster dat dan opzij
   moet springen is erger dan een venster dat wat verder weg staat. */
const puckMenuOuterPX=()=>CFG.ringPX+chipHeight()*1.35+10;
/* Welke optie ligt er onder deze tik? Het raakvlak is de hele taartpunt: van
   net buiten de schijf tot voorbij het label. Alleen de labelchip zou aan een
   tafel een te klein doel zijn — je tikt staand, van opzij, met een hele hand.
   Binnen de schijf telt niet mee: daar zit het kijkgat. Een puck met een
   dichte ring doet niet mee; om hem heen is de kaart gewoon kaart. */
function puckMenuHit(x,y){
  const inner=CFG.puckRadiusMM*pxPerMM+4, outer=puckMenuOuterPX();
  let best=null,bd=Infinity;
  for(const t of tracks.values()){
    if(t.state!=="recognised"||!t.ring) continue;
    const d=Math.hypot(x-t.x,y-t.y);
    if(d<inner||d>outer||d>=bd) continue;
    bd=d; best=t;
  }
  if(!best) return null;
  const items=ringItems(best);
  const idx=ringIndexOf(Math.atan2(y-best.y,x-best.x),items.length);
  const item=items[idx];
  return item?{track:best,idx,item}:null;
}
/* Een tik op de ring uitvoeren. Een uitgeschakelde optie doet niets, maar
   slikt de tik wel: hij hoort bij de puck en niet bij de kaart eronder, en een
   tik die "doorvalt" zou de sleepkopieën wissen. */
function tryPuckMenuTap(x,y){
  const hit=puckMenuHit(x,y);
  if(!hit) return false;
  if(hit.item.disabled) return true;
  hit.track.tapIdx=hit.idx; hit.track.tapT0=performance.now();
  commitPuckChoice(hit.track,hit.idx);
  return true;
}
/* Hoe fel de laatst aangetikte optie nog oplicht: 1 op het moment van de tik,
   0 als het voorbij is. Alleen voor het beeld — zonder die terugkoppeling weet
   je bij een optie die weinig verandert niet of je tik is aangekomen. */
function puckTapGlow(t,now){
  if(!t.tapT0) return 0;
  const k=1-(now-t.tapT0)/CFG.puckTapMS;
  return k>0?k:0;
}

/* De kaart bedienen met de puck zelf.

   Draaien is zoomen: elke `CFG.puckZoomRotDeg` graden is één zoomniveau, met
   de klok mee naar binnen, om de plek die op dát moment onder het kijkgat
   ligt. Dat ijkpunt mag hier meebewegen — anders dan bij het oude vooruit
   duwen verplaatst draaien de puck niet, dus de plek waar je op wijst blijft
   vanzelf staan. Het vaste ijkpunt dat daarvoor nodig was is daarmee weg.

   Schuiven is reizen. De puck onthoudt waar hij lag (`panOX/panOY`), en hoe
   verder hij daarvandaan komt hoe sneller de kaart die kant op reist. Duw je
   hem naar de bovenrand, dan reis je naar boven — de kaart schuift onder de
   puck door in plaats van eraan vast te zitten, en zo kom je met een puck van
   tien centimeter de hele provincie door zonder hem op te tillen.

   Het ijkpunt komt langzaam achter de puck aan (`CFG.puckPanEaseMS`). Blijf
   duwen en je blijft reizen; laat je hem los, dan haalt het ijkpunt hem in en
   staat de kaart binnen een paar tellen stil. Zonder dat blijft een puck die
   scheef ligt de kaart wegduwen tot iemand hem terugtrekt, en aan een tafel
   met publiek ligt er altijd wel een puck scheef.

   Een vastgezette kaart houdt ook de pucks buiten de deur; anders staat hij
   niet vast. Dat was met een menustand nog te overzien — je moest zelf voor
   Zoomen kiezen — maar nu bedient elke duw tegen een puck de kaart. */
function applyPuckControls(t,now){
  const dt=t.panT?Math.min(0.1,(now-t.panT)/1000):0;
  t.panT=now;
  // Niet (meer) herkend of de kaart staat vast: alleen bijhouden waar de puck
  // is, zodat hij niet bij het hervatten een hele reis in één beeld inhaalt.
  if(t.state!=="recognised"||mapLocked){
    t.panOX=t.x; t.panOY=t.y; t.zoomRot=t.angle; t.zoomCarry=0; return;
  }
  const dRot=t.angle-t.zoomRot;
  if(Math.abs(dRot)>=CFG.puckRotDeadRAD){
    /* Eerst het ijkpunt bijzetten, ook als we deze stap niet gebruiken: anders
       blijft de sprong staan en komt hij het volgende beeldje alsnog. */
    t.zoomRot=t.angle;
    // Wat sneller ging dan een hand kan draaien is geen draai maar een
    // meetsprong; die hoort niet op de kaart terecht te komen.
    const grens=CFG.puckRotMaxDegS*Math.PI/180*(dt||0.1);
    if(Math.abs(dRot)<=grens)
      t.zoomCarry+=(dRot/(CFG.puckZoomRotDeg*Math.PI/180));
  }
  /* De herkenning levert de hoek in kleine, niet exact gelijkmatige stapjes.
     Rechtstreeks zoomen maakte ieder stapje zichtbaar. De gemeten draaiing
     blijft exact behouden, maar wordt in ongeveer 70 ms gelijkmatig over de
     beelden verdeeld. */
  if(dt&&Math.abs(t.zoomCarry)>0.0001){
    const k=1-Math.exp(-dt*1000/CFG.puckZoomEaseMS);
    const dz=t.zoomCarry*k;
    t.zoomCarry-=dz;
    MV.zoomBy(dz,t.x,t.y);
  }
  const ox=t.x-t.panOX, oy=t.y-t.panOY, off=Math.hypot(ox,oy);
  if(dt&&off>CFG.puckPanDeadPX){
    const v=Math.min((off-CFG.puckPanDeadPX)*CFG.puckPanGain,CFG.puckPanMaxPXS)*dt;
    // De kaart de andere kant op schuiven laat het beeld de kant van de puck
    // op reizen: `panBy` verplaatst wat je ziet, niet waar je staat.
    MV.panBy(-ox/off*v,-oy/off*v);
  }
  if(dt&&CFG.puckPanEaseMS>0){
    const k=1-Math.exp(-dt*1000/CFG.puckPanEaseMS);
    t.panOX+=ox*k; t.panOY+=oy*k;
  }
}
/* Wat een tik is: kort aangeraakt, nauwelijks verschoven en nauwelijks
   gedraaid — zo blijft slepen slepen en draaien draaien. Die laatste grens
   telt nu dubbel: draaien is zoomen, dus een greep waarin de puck een slag
   maakt is geen tik maar een zoombeweging. */
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
/* De puck waarvan het kijkgat onder dit punt ligt. Bewust krap: alleen het
   gat telt, niet de hele schijf. */
function puckHoleAt(x,y){
  const hole=CFG.puckRadiusMM*pxPerMM*PUCK_HOLE;
  let best=null,bd=Infinity;
  for(const t of tracks.values()){
    if(t.state!=="recognised") continue;
    const d=Math.hypot(t.x-x,t.y-y);
    if(d<hole&&d<bd){ bd=d; best=t; }
  }
  return best;
}
/* Een tik in het kijkgat haalt de thema's tevoorschijn. Het gat is precies
   het punt dat als coördinaat wordt bewaard: je wijst dus eerst aan wáár je
   markering komt, en kiest daarna waar hij over gaat.
   Openen, niet omschakelen. Dezelfde tik komt langs twee wegen binnen (de
   aanwijzer, en de muis-nasleep van een sleepkopie); een schakelaar zou
   zichzelf meteen weer dicht doen. Sluiten gaat met `Terug` op de ring of
   door een thema te kiezen. Het venster van een markering die er al ligt komt
   terug met een tik op de zwarte band eromheen. */
function tryPuckHoleTap(x,y){
  const t=puckHoleAt(x,y);
  if(!t) return false;
  t.ring=true;
  return true;
}
function dropPin(t){
  const ll=MV.unproject(t.x,t.y);
  const pin={id:Date.now()+"-"+Math.random().toString(36).slice(2,6),
             lng:+ll.lng.toFixed(6), lat:+ll.lat.toFixed(6),
             verdict:t.tpl.verdict, topic:puckTopic(t),
             title:"", description:"", note:"", transcript:"", t:new Date().toISOString()};
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
  const topic=puckTopic(t);
  if(pin.topic===topic) return;
  pin.topic=topic;
  save();
  const view=noteViewFor(pin);
  if(view) notePart(view,"noteHead").textContent=vName(pin.verdict)+" · "+pin.topic;
}

/* Als de kennisgraaf open staat, krijgt een puck ook een zichtbare relatie
   met wat er op die plek bekend is. De drie best passende knopen houden het
   beeld leesbaar; een thematische overeenkomst is een volle, heldere lijn,
   een puur nabije relatie is subtiel gestreept. */
/* Vizier op het middelpunt van een puck. Dat middelpunt is de coordinaat die
   bij bevestigen als markering wordt vastgelegd, dus het moet van een meter
   afstand nog exact aanwijsbaar zijn: een ring met vier streepjes eromheen en
   een stip in het hart. Alles schaalt mee met de puckstraal `R`. */
/* Straal van het kijkgat in het hart van de puck, als deel van de puckstraal.
   Het vizier schaalt mee met het gat; de teksten staan in de zwarte band
   daarbuiten. */
const PUCK_HOLE=0.58;
function drawTarget(ctx,x,y,c,R){
  // Maten hangen aan het kijkgat, niet aan de hele puck: wordt het gat groter,
  // dan groeit het vizier mee en blijft de verhouding hetzelfde.
  const hole=R*PUCK_HOLE;
  const ring=hole*0.47, gap=hole*0.2, arm=hole*0.8;
  const draw=()=>{
    ctx.beginPath(); ctx.arc(x,y,ring,0,Math.PI*2); ctx.stroke();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      ctx.beginPath();
      ctx.moveTo(x+dx*gap,y+dy*gap);
      ctx.lineTo(x+dx*arm,y+dy*arm);
      ctx.stroke();
    }
  };
  ctx.save();
  ctx.lineCap="round";
  // Het gat laat de kaart door, dus het vizier krijgt eerst een donkere
  // onderlijn; anders valt hij weg op een licht stuk kaart.
  ctx.strokeStyle="rgba(9,12,17,.55)"; ctx.lineWidth=4; draw();
  ctx.strokeStyle=c; ctx.lineWidth=1.5; draw();
  ctx.fillStyle=c;
  ctx.beginPath(); ctx.arc(x,y,Math.max(1.5,R*0.022),0,Math.PI*2); ctx.fill();
  ctx.restore();
}

/* Het notitievenster hangt aan één puck. Zonder zichtbare verbinding zweeft
   het ernaast, en met vier pucks op tafel is dan niet te zien van wie het is.
   Een lijn van de rand van de puck naar de dichtstbijzijnde rand van het
   venster, met een punt op de puck: het venster zit er zichtbaar aan vast.
   Op het canvas, want het venster zelf klemt alles buiten zijn rand weg. */
function drawNoteTether(ctx,pucks){
  for(const v of openNotes()) drawOneTether(ctx,pucks,v);
}
function drawOneTether(ctx,pucks,v){
  const n=v.el, pin=v.pin;
  const t=pucks.find(p=>p.pinId===pin.id);
  if(!t) return;
  const r=n.getBoundingClientRect();
  if(!r.width) return;
  // Dichtstbijzijnde punt op de rand van het venster: klemmen volstaat.
  const px=Math.max(r.left,Math.min(r.right,t.x)), py=Math.max(r.top,Math.min(r.bottom,t.y));
  const dx=px-t.x, dy=py-t.y, d=Math.hypot(dx,dy);
  const R=CFG.puckRadiusMM*pxPerMM;
  if(d<=R+8) return;                            // venster ligt tegen de puck aan
  const ux=dx/d, uy=dy/d, c=vColor(pin.verdict);
  ctx.save(); ctx.lineCap="round";
  ctx.strokeStyle=c; ctx.globalAlpha=0.75; ctx.lineWidth=2.5;
  ctx.beginPath();
  ctx.moveTo(t.x+ux*R,t.y+uy*R); ctx.lineTo(t.x+ux*(d-1),t.y+uy*(d-1));
  ctx.stroke();
  ctx.globalAlpha=1;
  ctx.beginPath(); ctx.arc(t.x+ux*R,t.y+uy*R,Math.max(4,R*0.065),0,Math.PI*2);
  ctx.fillStyle=c; ctx.fill();
  ctx.strokeStyle="rgba(7,9,12,.8)"; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}

function drawPuckKnowledgeRelations(ctx,pucks){
  if(!kg.enabled||!kg.loaded||!pucks.length) return;
  const visible=(x,y)=>x>=-24&&y>=-24&&x<=W+24&&y<=H+24;

  ctx.save();
  for(const puck of pucks){
    if(puck.state!=="recognised"&&puck.state!=="incomplete") continue;
    const ll=MV.unproject(puck.x,puck.y);
    const topic=puckTopic(puck);
    /* `nearby()` rekent een haversine over alle knopen in de graaf. Dat voor
       elke puck, elk beeld, is honderdduizend berekeningen per seconde voor
       drie lijntjes die vrijwel nooit veranderen — en de weggegooide objecten
       leveren een opruimpauze op precies wanneer iemand een puck draait. Dus
       onthouden per puck, en pas opnieuw rekenen als hij een meter of tien
       verschoven is of van thema wisselde. */
    const key=ll.lat.toFixed(4)+","+ll.lng.toFixed(4)+"|"+topic+"|"+kg.nodes.length;
    if(puck.kgKey!==key){
      puck.kgKey=key;
      puck.kgRelations=nearby(ll.lat,ll.lng,{theme:topic,limit:3,radiusM:1200});
    }
    const relations=puck.kgRelations||[];
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

/* Opslaan was `try{...}catch(e){}` — een volle browseropslag verdween daarmee
   zonder spoor, en dat is precies wat er gebeurt zodra iemand de kaart offline
   bewaart (die stond in dezelfde 5 MB; zie bakeMap, dat nu IndexedDB gebruikt).
   Je merkte het pas na de herlaadbeurt, en dan was de middag weg. */
let storageFull=false, pinsRevision=0;
function save(){
  pinsRevision++;
  try{ localStorage.setItem("pucktable-"+el("sess").value,JSON.stringify(pins)); storageFull=false; }
  catch(e){ storageFull=true; }
}
/* Tijdens het typen hoeft niet elke aanslag naar de opslag. */
let saveTimer=null;
function saveSoon(){ clearTimeout(saveTimer); saveTimer=setTimeout(save,400); }
const VERDICT_KEYS=new Set(VERDICTS.map(v=>v.key));
const validPin=p=>!!p && typeof p==="object" && VERDICT_KEYS.has(p.verdict)
                 && Number.isFinite(+p.lat) && Number.isFinite(+p.lng);
function cleanPin(p){
  const text=v=>typeof v==="string"?v:"";
  const c=p.contact&&typeof p.contact==="object"?p.contact:null;
  const contact=c&&c.consent===true&&(text(c.email)||text(c.phone))
    ? {name:text(c.name),email:text(c.email),phone:text(c.phone),consent:true,
       consentAt:text(c.consentAt)||new Date().toISOString()}
    : undefined;
  return {...p, lat:+p.lat, lng:+p.lng,
          id:String(p.id||Date.now()+"-"+Math.random().toString(36).slice(2,6)),
          topic:text(p.topic)||topics()[0],
          title:text(p.title), description:text(p.description)||text(p.note), note:text(p.note),
          transcript:text(p.transcript), contact,
          t:typeof p.t==="string"&&p.t.length>=16?p.t:new Date().toISOString()};
}
function restore(){
  pins.length=0;
  try{
    const session=el("sess").value;
    const sessionKey="pucktable-"+session;
    const demoKey="pucktable-demo-pins-v1";
    const raw=localStorage.getItem(sessionKey);
    const stored=raw===null?[]:JSON.parse(raw);
    /* Ongezien terugzetten wat er in de opslag staat is hier gevaarlijker dan
       het lijkt: één markering met een onbekend oordeel laat `vColor()` gooien
       middenin de tekenlus, en dan wordt alles ná die regel — de pucks, het
       ringmenu — nooit meer getekend. Elke frame opnieuw, tot iemand de opslag
       leegt. Templates en eigen pucks werden al gecontroleerd; markeringen niet. */
    if(Array.isArray(stored)){
      stored.filter(validPin).forEach(p=>pins.push(cleanPin(p)));
      // Wat er niet doorheen kwam schrijven we ook weg: anders staat het er de
      // volgende keer weer, en is de eerstvolgende wijziging in de sessie de
      // enige die het opruimt.
      if(stored.length!==pins.length) localStorage.setItem(sessionKey,JSON.stringify(pins));
    }

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
let tapStart=null;
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
  if(e.target.closest(".panel")||e.target.closest("#learn")||puckTouches.length||pinMoveMode||learn.open) return;
  tapStart={x:e.clientX,y:e.clientY,t:performance.now()};
});
addEventListener("pointerup",e=>{
  if(!tapStart) return;
  const quick=performance.now()-tapStart.t<350 && Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)<12;
  tapStart=null;
  if(!quick) return;
  // Een tik in het kijkgat haalt de thema's erbij; dat gaat voor op al het
  // andere, want het is het begin van alles wat er nieuw op de kaart komt.
  if(tryPuckHoleTap(e.clientX,e.clientY)) return;
  // Daarna de ring eromheen: daar kiest een tik een optie. Dat gaat voor op
  // alles wat er verder onder de tik kan liggen, want de ring hoort bij de puck.
  if(tryPuckMenuTap(e.clientX,e.clientY)) return;
  // A tap that lands on a puck (simulated or detected) belongs to that puck.
  const R=CFG.puckRadiusMM*pxPerMM;
  const onTrack=puckTrackAt(e.clientX,e.clientY);
  if(onTrack){
    /* Een puck die al vast ligt: een tik op de zwarte band opent zijn venster
       weer, dubbeltikken zet het op de andere kant. Het kijkgat is van de
       thema's, dus de band is de weg terug naar wat je geschreven hebt.
       Dit staat vóór de sleepkopie, anders werkt het op een laptop niet: daar
       ligt onder elke puck ook een sleepkopie, en die slikte de tik. */
    const own=onTrack.pinId?pins.find(p=>p.id===onTrack.pinId):null;
    if(own){
      if(doubleTap(own.id)) flipNote(own,onTrack.x,onTrack.y);
      else openNote(own,onTrack.x,onTrack.y,true);
      return;
    }
  }
  if(simPuckAt(e.clientX,e.clientY)) return;
  if(onTrack) return;
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
  if(node){ closeNotes(); openKgInfo(node,e.clientX,e.clientY); return; }
  // Een leeg stuk tafel is kaartbediening en sluit geen open panelen. De
  // gebruiker sluit die bewust met hun sluitknop of met Escape.
  clearPucks(false);
});
/* De hoogte van het venster staat niet vooraf vast: eerst komt de lijst met
   nabije documenten binnen, daarna groeit het antwoord token voor token. Dus
   meten en dan pas plaatsen.

   `recentre` scheidt de twee gevallen. Bij openen wordt het venster op de
   markering gecentreerd; groeit het daarna, dan blijft het staan waar het
   staat en schuift het alleen omhoog zodra het anders van het scherm zou
   lopen. Zonder dat onderscheid zou het bij elk binnengekomen woord
   verspringen. */
/* ── Twee vensters, één per tafelkant ────────────────────────────────────
   Aan een tafel met twee kanten werken twee groepen tegelijk. Met één venster
   pakte de tweede puck het venster van de eerste af, midden in een zin. Er
   zijn er daarom twee: één per kant, elk met zijn eigen toetsenbord. Meer dan
   twee niet -- dan staat het glas vol en is niet meer te zien welk venster bij
   wie hoort; een derde puck neemt het venster van zijn eigen kant over.

   `#note` en `#keyboard` in index.html zijn de voorkant. De overkant is een
   kloon waarvan elke id een "-b" krijgt, zodat ids uniek blijven. Alles wat de
   opmaak nodig heeft hangt daarom aan klassen (`.note`, `.talk-btn`, …), niet
   aan ids; de ids zijn er alleen nog voor JS en voor de rooktest. */
function cloneWithSuffix(node,suffix){
  const c=node.cloneNode(true);
  const fix=n=>{ if(n.id) n.id+=suffix; if(n.htmlFor) n.htmlFor+=suffix; };
  fix(c); c.querySelectorAll("[id],label[for]").forEach(fix);
  return c;
}
const noteViews=[];
/* Een onderdeel van dít venster. Zonder achtervoegsel is het de voorkant, dus
   `notePart(voorkant,"noteTitle")` is gewoon `#noteTitle`. */
const notePart=(v,id)=>document.getElementById(id+v.suffix);
const noteViewOf=node=>noteViews.find(v=>v.el.contains(node))||null;
const openNotes=()=>noteViews.filter(v=>v.pin);
const noteViewFor=pin=>noteViews.find(v=>v.pin===pin)||null;
const noteViewOnSide=side=>noteViews.find(v=>v.side===side)||noteViews[0];
function buildNoteViews(){
  for(const side of ["a","b"]){
    const suffix=side==="a"?"":"-b";
    const root=side==="a"?el("note"):cloneWithSuffix(el("note"),suffix);
    if(side!=="a"){ root.style.display="none"; document.body.appendChild(root); }
    const v={side,suffix,el:root,pin:null,askAbort:null,flip:side==="b",
             talkMsg:{key:"",args:[],warn:false},talkLang:null};
    noteViews.push(v);
    wireNote(v);
  }
}
/* Elke knop in het venster hoort bij dít venster. Vandaar hier en niet één
   keer op een id: er zijn er twee van alles. */
function wireNote(v){
  const q=id=>notePart(v,id);
  q("noteFlip").onclick=()=>flipNote(v.pin);
  q("noteSave").onclick=()=>{
    const pin=v.pin;
    if(pin){ setTimeout(()=>{ if(v.pin===pin) renderMatches(v,pin); },0); noteToPin(v); save(); }
    if(pin) showContactFollowup(v,pin); else closeNote(v);
  };
  q("contactSkip").onclick=()=>closeNote(v);
  q("contactSave").onclick=()=>saveContactFollowup(v);
  q("noteDel").onclick=()=>{
    if(v.pin){ const i=pins.indexOf(v.pin); if(i>=0) pins.splice(i,1); save(); }
    closeNote(v);
  };
  q("noteAsk").onclick=()=>askKnowledge(v);
  for(const id of ["noteTitle","noteText"])
    q(id).addEventListener("input",()=>{ noteToPin(v); saveSoon(); });
  q("talkBtn").onclick=()=>toggleTalk(v);
  for(const [id,keuze] of talkLangKnoppen())
    q(id).onclick=()=>{ if(talkRunning(v.pin)) return; v.talkLang=keuze; renderTalkLang(v); };
  q("talkClear").onclick=()=>{
    if(!v.pin) return;
    v.pin.transcript=""; q("talkText").value=""; q("talkClear").style.display="none"; save();
  };
  q("talkText").addEventListener("input",()=>{
    if(!v.pin) return;
    v.pin.transcript=q("talkText").value; saveSoon();
  });
  q("talkAudio").onclick=saveTalkAudio;
  // Elk venster kijkt naar zijn eigen hoogte: groeit het antwoord, dan schuift
  // dit venster terug in beeld en het andere niet.
  if(typeof ResizeObserver!=="undefined")
    new ResizeObserver(()=>positionNote(v,false)).observe(v.el);
}
buildNoteViews();

/* Contactgegevens zijn bewust een tweede, optionele stap. De bijdrage is op
   dit moment al bewaard; overslaan kan hem dus nooit ongedaan maken. */
function showContactFollowup(v,pin){
  const c=pin.contact||{};
  notePart(v,"contactName").value=c.name||"";
  notePart(v,"contactEmail").value=c.email||"";
  notePart(v,"contactPhone").value=c.phone||"";
  notePart(v,"contactConsent").checked=c.consent===true;
  const status=notePart(v,"contactStatus");
  status.textContent=""; status.classList.remove("saved");
  v.el.classList.add("contact-step");
  positionNote(v);
  notePart(v,"contactName").focus();
}
function saveContactFollowup(v){
  if(!v.pin) return;
  const name=notePart(v,"contactName").value.trim();
  const email=notePart(v,"contactEmail").value.trim();
  const phone=notePart(v,"contactPhone").value.trim();
  const consent=notePart(v,"contactConsent").checked;
  const status=notePart(v,"contactStatus");
  status.classList.remove("saved");
  if(!email&&!phone){ status.textContent=tr("contactNeedDetail"); return; }
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    status.textContent=tr("contactInvalidEmail"); return;
  }
  if(!consent){ status.textContent=tr("contactNeedConsent"); return; }
  const old=v.pin.contact;
  v.pin.contact={name,email,phone,consent:true,
    consentAt:old?.consentAt||new Date().toISOString()};
  save();
  status.textContent=tr("contactSaved"); status.classList.add("saved");
  const pin=v.pin;
  setTimeout(()=>{ if(v.pin===pin) closeNote(v); },650);
}

function positionNote(v,recentre=true){
  const n=v?.el;
  if(!n||n.style.display!=="block") return;
  const s=uiScale;
  const y=+n.dataset.anchorY||innerHeight/2;   // schermpixels
  const h=n.offsetHeight*s;                    // idem: offsetHeight telt ongeschaald
  let lo=12, hi=Math.max(12,innerHeight-h-12);
  /* Staan er twee vensters open, dan houdt elk zich aan zijn eigen helft van
     de tafel: anders schuift het venster van de overkant over dat van jou
     heen. Past het venster daar niet in, dan gaat lezen voor en mag het over
     de middenlijn. */
  if(openNotes().length>1 && h<=innerHeight/2-18){
    if(v.flip) hi=Math.min(hi,innerHeight/2-h-6);
    else lo=Math.max(lo,innerHeight/2+6);
  }
  const prev=parseFloat(n.style.top);
  const wanted=recentre?y-h/2:(Number.isFinite(prev)?prev*s:y-h/2);
  const top=Math.max(lo,Math.min(hi,wanted));
  n.style.top=(top/s)+"px";
}
// Elk venster heeft zijn eigen waarnemer (zie wireNote): elke hoogtewijziging
// trekt het zo nodig terug binnen beeld.

/* Aan welke kant van de markering het venster opengaat hangt af van waar nog
   ruimte is. Die ruimte verandert zodra de bediening groter of kleiner wordt,
   dus dit staat los van openNote en kan opnieuw gedraaid worden. */
function positionNoteX(v){
  const n=v?.el;
  if(!n||n.style.display!=="block") return;
  const s=uiScale;
  const x=+n.dataset.anchorX||innerWidth/2;
  const reach=+n.dataset.puckReach||34;
  const width=n.offsetWidth*s;                 // schermpixels
  const opensRight=x+width+reach<innerWidth-12;
  const left=opensRight?x+reach:x-reach-width;
  n.style.left=(Math.max(12,Math.min(innerWidth-width-12,left))/s)+"px";
  n.style.setProperty("--origin-x",opensRight?"0":"100%");
  n.style.setProperty("--enter-x",opensRight?"-28px":"28px");
}

/* Automatisch opent het venster naar de kant waar de tik vandaan komt, maar
   wie aan de overkant staat kan het overnemen: de knop ⇅ in het venster of een
   dubbeltik op de markering. Die keuze blijft bij de puck (`pin.flip`) tot
   iemand hem terugdraait; zonder keuze geldt weer de automatische regel. */
const flipFor=(pin,y)=>
  sidesActive() && typeof pin?.flip==="boolean" ? pin.flip : flippedFor(y);

/* Van kant wisselen is nu verhuizen: elke kant heeft zijn eigen venster, dus
   de markering gaat naar het venster aan de overkant (met zijn toetsenbord).
   Een lopende opname loopt door -- het is dezelfde markering. */
function flipNote(pin,x,y){
  if(!pin||!sidesActive()) return;
  const v=noteViewFor(pin);
  const ax=v?(+v.el.dataset.anchorX||innerWidth/2):(x??innerWidth/2);
  const ay=v?(+v.el.dataset.anchorY||innerHeight/2):(y??innerHeight/2);
  pin.flip=!flipFor(pin,ay);
  save();
  openNote(pin,ax,ay,true);
}
/* Wisselt de tafelstand terwijl er vensters open staan, dan horen die mee te
   verhuizen in plaats van dicht te gaan. Eerst opnemen wat er open staat: het
   heropenen verplaatst vensters, en dan schuift de lijst onder je vandaan. */
function reorientNote(){
  const open=openNotes().map(v=>({pin:v.pin,
      x:+v.el.dataset.anchorX||innerWidth/2, y:+v.el.dataset.anchorY||innerHeight/2}));
  for(const o of open) openNote(o.pin,o.x,o.y,true);
}

function openNote(pin,x,y,fromPuck=false){
  // Welke kant van de tafel: bovenaan het scherm staat iemand aan de overkant.
  const v=noteViewOnSide(flipFor(pin,y)?"b":"a");
  // Dezelfde markering hoort in één venster te staan. Stond hij aan de andere
  // kant, dan verhuist hij hierheen -- met zijn opname, want het is dezelfde
  // bijdrage en dezelfde microfoon.
  const was=noteViewFor(pin);
  if(was&&was!==v) closeNote(was,{keepTalk:true});
  // Wat er aan déze kant stond gaat dicht; die opname hoort wel te stoppen,
  // want er luistert dan niemand meer mee.
  if(v.pin&&v.pin!==pin) closeNote(v);
  v.pin=pin;
  const n=v.el;
  n.classList.remove("contact-step");
  // Een venster hangt aan een markering. Gaat het bij een andere markering
  // open, dan hoort het weer naast díe markering te beginnen — de vorige
  // verschuiving met de hand geldt niet voor een nieuw venster.
  resetPanelOffset(n);
  n.style.display="block";
  n.classList.toggle("flipped",v.flip);
  n.style.setProperty("--flip",v.flip?"180deg":"0deg");
  n.style.setProperty("--note-color",vColor(pin.verdict));
  n.dataset.anchorX=String(x);
  n.dataset.anchorY=String(y);
  // Het venster gaat naast de puck open, maar moet ook langs zijn ring met
  // keuzes vallen: anders ligt het over "Kiezen" en "Zoomen" heen. De maat
  // volgt daarom de ring en de chips die eromheen staan.
  n.dataset.puckReach=String(fromPuck?Math.round(puckMenuOuterPX()):34);
  positionNoteX(v);
  positionNote(v);
  n.classList.remove("opening");
  if(fromPuck){ void n.offsetWidth; n.classList.add("opening"); }
  notePart(v,"noteHead").textContent=vName(pin.verdict)+" · "+pin.topic;
  notePart(v,"noteTitle").value=pin.title||"";
  notePart(v,"noteText").value=pin.description||pin.note||"";
  /* Een nieuw gesprek begint bij de taal van de tafel. De keuze hoort bij dit
     venster zolang het openstaat en wordt niet bewaard: de volgende groep aan
     tafel hoort niet ineens in het Engels te worden uitgeschreven. */
  if(!talkRunning(pin)) v.talkLang=null;
  renderTalk(v);
  if(!talkRunning(pin)) checkTalk(v);
  fillNoteKnowledge(v,pin);
  notePart(v,"noteTitle").focus();
  return v;
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
function fillNoteKnowledge(v,pin){
  v.askAbort?.abort(); v.askAbort=null;
  notePart(v,"noteAnswer").textContent=""; notePart(v,"noteAnswer").style.display="none";
  notePart(v,"noteSources").textContent=""; notePart(v,"noteSources").style.display="none";
  const box=notePart(v,"noteNearby");
  box.innerHTML=""; box.appendChild(emptyLine(tr("kgLoading")));
  notePart(v,"noteMatches").textContent=""; notePart(v,"noteMatchHead").style.display="none";
  ensureKG(kgUrl()).then(()=>{
    if(v.pin!==pin) return;
    renderNearby(v,pin);
    renderMatches(v,pin);
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
  // Welk venster dit is, volgt uit de regel zelf: met twee vensters open kan
  // dit er een van beide zijn.
  const v=noteViewOf(row);
  const open=row.nextElementSibling?.classList.contains("kg-quote");
  [...row.parentElement.querySelectorAll(".kg-quote")].forEach(q=>q.remove());
  if(open){ positionNote(v,false); return; }
  if(node.type==="document"){
    openDocument(node.id,node.label);
    return;
  }
  const box=document.createElement("div");
  box.className="kg-quote"; box.textContent=tr("searching");
  row.after(box);
  positionNote(v,false);
  const k=await knowledgeOf(node.id);
  const chunks=(k?.chunks||[]).slice(0,3);
  if(!k){ box.textContent=tr("noBackend"); positionNote(v,false); return; }
  if(!chunks.length){ box.textContent=tr("noExcerpts"); positionNote(v,false); return; }
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
  positionNote(v,false);
}

function renderNearby(v,pin){
  const box=notePart(v,"noteNearby");
  box.textContent="";
  if(!kg.loaded){ box.appendChild(emptyLine(tr("kgUnreachable"))); return; }
  const near=nearby(pin.lat,pin.lng,{theme:pin.topic,limit:4});
  if(!near.length){ box.appendChild(emptyLine(tr("nothingWithin"))); return; }
  for(const r of near){
    const row=kgRow(r.node.label,formatDistance(r.dist),r.match?"match":"");
    row.onclick=()=>kgReveal(row,r.node);
    box.appendChild(row);
  }
  positionNote(v);
}

/* Zoeken op de bétekenis van wat er gezegd is, los van de afstand. Vandaar
   een eigen lijstje: dit zijn stukken die over het onderwerp gaan, ook als
   ze aan de andere kant van de stad hangen. */
async function renderMatches(v,pin){
  const box=notePart(v,"noteMatches"), head=notePart(v,"noteMatchHead");
  box.textContent=""; head.style.display="none";
  const q=[pin.title,pin.description||pin.note].filter(Boolean).join(" ");
  const docs=await relevantDocs(q);
  if(v.pin!==pin||!docs.length) return;
  head.style.display="block";
  for(const d of docs){
    const row=kgRow(d.title,d.year?String(d.year):"");
    row.onclick=()=>openDocument(d.id,d.title);
    box.appendChild(row);
  }
  positionNote(v,false);
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

async function askKnowledge(v){
  const pin=v?.pin; if(!pin) return;
  const near=kg.loaded?nearby(pin.lat,pin.lng,{theme:pin.topic,limit:4}):[];
  const out=notePart(v,"noteAnswer"), src=notePart(v,"noteSources");
  out.style.display="block"; out.textContent=tr("thinking"); out.scrollTop=0;
  src.style.display="none"; src.textContent="";
  /* Het kader heeft een vaste hoogte, dus schuift de tekst zelf mee zolang
     niemand zelf omhoog gescrold heeft. Wie terugleest houdt zijn plek. */
  const atEnd=()=>out.scrollHeight-out.scrollTop-out.clientHeight<24;
  let follow=true;
  out.onscroll=()=>{ follow=atEnd(); };
  v.askAbort?.abort(); v.askAbort=new AbortController();
  const question=buildQuestion({
    title:pin.title, description:pin.description||pin.note, topic:pin.topic,
    verdictName:vName(pin.verdict),
    place:near[0]?near[0].node.label:`${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`,
    near,
  });
  try{
    await ask(question,{
      signal:v.askAbort.signal,
      onToken:t=>{ if(v.pin!==pin) return;
        out.innerHTML=mdToHtml(t);
        if(follow) out.scrollTop=out.scrollHeight; },
      onSources:list=>{ if(v.pin!==pin||!list.length) return;
        src.style.display="block";
        src.textContent=tr("basedOn",[...new Set(list.map(s=>s.title))].slice(0,4).join(" · ")); },
    });
  }catch(e){
    if(e.name!=="AbortError") out.textContent=tr("noAnswer",e.message);
  }
}
/* Eén venster sluiten. `keepTalk` is er voor het verhuizen naar de andere
   kant: dan gaat dit venster dicht terwijl dezelfde markering aan de overkant
   verder praat. */
function closeNote(v,{keepTalk=false}={}){
  if(!v||!v.pin) return;
  if(!keepTalk&&talkPin===v.pin) stopTalk(true);
  // Wat er in de velden stond staat al in de markering (zie noteToPin), maar
  // de opslag kan nog in de wacht staan; die trekken we hier recht.
  if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; save(); }
  v.askAbort?.abort(); v.askAbort=null;
  const n=v.el; n.style.display="none"; n.classList.remove("opening");
  v.pin=null;
  hideKeyboardIn(n);
}
/* Alles dicht: bij het wisselen van stand, het verslepen van markeringen, of
   een tik op de kennisgraaf hoort er geen venster te blijven staan. */
function closeNotes(){ for(const v of noteViews) closeNote(v); }


/* ── Het gesprek uitschrijven ────────────────────────────────────────────
   Wat er getypt wordt is een samenvatting; het gesprek eromheen is waar het
   om begonnen was. Zodra er een plek en een thema liggen kan de groep hier
   op opnemen drukken en gewoon doorpraten — de tekst loopt mee in het
   venster en blijft bij die ene markering staan.

   De bron van waarheid is `pin.transcript`, niet het tekstvak: er wordt aan
   deze tafel met meerdere mensen tegelijk gewerkt, en wie halverwege een zin
   verbetert mag dat niet kwijtraken aan de volgende brok spraak. speech.js
   levert daarom afgeronde stukjes, die we achteraan plakken.

   Eén opname tegelijk. Wie een tweede markering opent, stopt de eerste — een
   microfoon die stilletjes bij een gesloten venster blijft luisteren is
   precies wat je aan een tafel met publiek niet wilt. */
let talk=null;                 // lopende opname (sessie uit speech.js)
let talkPin=null;              // markering waar die opname bij hoort
let talkStartedAt=0, talkTick=null;
let talkAudioBlob=null;        // alleen in de opnamestand: het geluid zelf

const talkTextOf=pin=>typeof pin?.transcript==="string"?pin.transcript:"";
const talkRunning=pin=>!!talk&&talkPin===pin;
/* Het venster waar de lopende opname in staat, als het nog open is. Er is één
   microfoon, dus hoogstens één venster neemt op; de andere kant ziet dat aan
   zijn eigen melding (`talkBusy`). */
const talkView=()=>talkPin?noteViewFor(talkPin):null;

/* De melding onder het tekstvak wordt door JS gezet, dus onthouden we welke
   het is: bij een taalwissel moet dezelfde zin in de andere taal komen te
   staan in plaats van te blijven hangen. */
function setTalkMsg(v,key,{warn=false,args=[]}={}){
  if(!v) return;
  v.talkMsg={key,args,warn};
  const p=notePart(v,"talkStatus");
  p.textContent=key?tr(key,...args):"";
  p.classList.toggle("warn",!!key&&warn);
}

function talkClock(){
  const s=Math.max(0,Math.round((performance.now()-talkStartedAt)/1000));
  return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
}
function showTalkClock(){
  const v=talkView();
  if(v) notePart(v,"talkTime").textContent=talk?talkClock():"";
}
function startTalkClock(){
  stopTalkClock();
  showTalkClock();
  talkTick=setInterval(showTalkClock,1000);
}
function stopTalkClock(){
  clearInterval(talkTick); talkTick=null;
  for(const v of noteViews) notePart(v,"talkTime").textContent="";
}

function renderTalk(v){
  const pin=v.pin, box=notePart(v,"talkText");
  box.value=talkTextOf(pin);
  notePart(v,"talkPartial").textContent="";
  notePart(v,"talkClear").style.display=box.value?"":"none";
  notePart(v,"talkAudio").style.display=(talkAudioBlob&&talkPin===pin)?"":"none";
  const rec=talkRunning(pin);
  notePart(v,"talkBtn").classList.toggle("rec",rec);
  notePart(v,"talkBtn").textContent=tr(rec?"talkStop":"talkStart");
  if(!rec) notePart(v,"talkTime").textContent="";
  renderTalkLang(v);
}

/* -- De taal van het gesprek ---------------------------------------------
   Standaard die van de tafel; wie iets anders kiest doet dat voor dit ene
   gesprek. "auto" bestaat alleen met de eigen uitschrijfdienst erachter: die
   kan een blokje zonder taal aannemen en hem zelf bepalen. De
   spraakherkenning van de browser moet vooraf weten welke taal ze hoort, dus
   daar staat de knop er niet -- een keuze die niets doet is erger dan geen
   keuze. */
/* Een functie en geen const: `wireNote` draait al bij het opbouwen van de
   vensters, ruim voordat dit deel van het bestand aan de beurt is. */
function talkLangKnoppen(){ return [["talkLangNl","nl"],["talkLangEn","en"],["talkLangAuto","auto"]]; }
const talkAutoOk=()=>stt.mode==="backend";
function talkLangOf(v){
  const keuze=v.talkLang||lang;
  return keuze==="auto"&&!talkAutoOk()?lang:keuze;
}
function renderTalkLang(v){
  const box=notePart(v,"talkLang");
  /* Zonder uitschrijven doet de taal niets: in de opnamestand gaat het geluid
     zoals het is naar de schijf, en zonder microfoon gebeurt er niets. */
  const zin=stt.mode==="browser"||stt.mode==="backend";
  box.style.display=zin?"":"none";
  if(!zin) return;
  const rec=talkRunning(v.pin), nu=talkLangOf(v);
  box.classList.toggle("locked",rec);
  notePart(v,"talkLangAuto").style.display=talkAutoOk()?"":"none";
  for(const [id,keuze] of talkLangKnoppen()){
    const b=notePart(v,id), mine=nu===keuze;
    b.classList.toggle("on",mine);
    b.setAttribute("aria-pressed",String(mine));
    b.disabled=rec;
  }
}

/* Wat kan deze tafel? Eén keer polsen, en het antwoord meteen laten zien:
   dat "uitschrijven hier niet kan" hoort te blijken vóór iemand tien minuten
   in een microfoon praat, niet erna. */
function checkTalk(v){
  if(stt.checked){ talkReady(v); return; }
  setTalkMsg(v,"talkCheck");
  probeSTT(sttUrl()).then(()=>{ if(v.pin) talkReady(v); });
}
function talkReady(v){
  renderTalkLang(v);                           // nu pas is bekend wat er kan
  if(talk){
    // Eén microfoon: aan de overkant loopt er al een opname.
    if(talkPin!==v.pin) setTalkMsg(v,"talkBusy",{warn:true});
    return;
  }
  if(stt.mode==="geen") setTalkMsg(v,stt.reason==="insecure"?"talkInsecure":"talkNoMic",{warn:true});
  else if(stt.mode==="audio") setTalkMsg(v,"talkOnlyAudio",{warn:true});
  else setTalkMsg(v,"");
}

function appendTalk(pin,text){
  const t=String(text||"").trim();
  if(!t) return;
  const had=talkTextOf(pin).replace(/\s+$/,"");
  pin.transcript=had?had+" "+t:t;
  const v=noteViewFor(pin);
  if(v){
    const box=notePart(v,"talkText");
    box.value=pin.transcript;
    box.scrollTop=box.scrollHeight;
    notePart(v,"talkClear").style.display="";
  }
  saveSoon();
}

let talkBusy=false;
async function toggleTalk(v){
  if(talkRunning(v.pin)){ stopTalk(); return; }
  const pin=v.pin;
  if(!pin||talkBusy) return;
  /* Eén microfoon voor de hele tafel. Neemt de overkant op, dan is dat geen
     fout maar iets om te zeggen -- anders drukt iemand tien keer op een knop
     die niets lijkt te doen. */
  if(talk){ setTalkMsg(v,"talkBusy",{warn:true}); return; }
  talkBusy=true;
  try{
    setTalkMsg(v,"talkStarting");
    await probeSTT(sttUrl());
    if(v.pin!==pin) return;
    if(stt.mode==="geen"){ talkReady(v); return; }
    const session=await startTalk({
      lang:talkLangOf(v),
      onSegment:text=>appendTalk(pin,text),
      onPartial:text=>{ const w=noteViewFor(pin);
        if(talkPin===pin&&w) notePart(w,"talkPartial").textContent=text; },
      onError:key=>talkError(key),
      onAudio:blob=>{
        talkAudioBlob=blob;
        const w=noteViewFor(pin);
        if(w){ notePart(w,"talkAudio").style.display=""; setTalkMsg(w,"talkAudioReady"); }
      },
    });
    if(!session) return;                       // speech.js heeft de reden al gemeld
    if(v.pin!==pin){ session.stop(); return; }
    talk=session; talkPin=pin;
    talkAudioBlob=null; notePart(v,"talkAudio").style.display="none";
    talkStartedAt=performance.now(); startTalkClock();
    renderTalk(v);
    setTalkMsg(v,session.mode==="browser"?"talkListening"
                :session.mode==="backend"?"talkWriting":"talkRecording");
  }finally{ talkBusy=false; }
}

function stopTalk(quiet=false){
  const session=talk, pin=talkPin, v=talkView();
  talk=null; talkPin=null;
  stopTalkClock();
  if(v){
    notePart(v,"talkPartial").textContent="";
    notePart(v,"talkBtn").classList.remove("rec");
    notePart(v,"talkBtn").textContent=tr("talkStart");
    renderTalkLang(v);                         // de taal mag weer om
  }
  const mode=session?.mode;
  /* De uitschrijfstand heeft misschien nog een blokje onderweg; die laatste
     woorden horen er nog bij voordat we zeggen hoeveel het er zijn. */
  Promise.resolve(session?.stop()).then(()=>{
    save();
    if(quiet||!v||v.pin!==pin) return;
    if(mode==="audio") return;                 // onAudio zet zijn eigen melding
    const words=talkTextOf(pin).split(/\s+/).filter(Boolean).length;
    setTalkMsg(v,words?"talkDone":"talkNoText",{args:[words]});
    renderTalk(v);
  });
}

function talkError(key){
  const v=talkView()||openNotes()[0];
  // Wegvallende uitschrijfdienst: melden, maar door blijven opnemen.
  if(key==="backend"){ setTalkMsg(v,"talkBackendGone",{warn:true}); return; }
  if(talk) stopTalk(true);
  setTalkMsg(v,key==="denied"?"talkDenied"
              :key==="insecure"?"talkInsecure"
              :key==="browser"?"talkBrowserGone":"talkNoMic",{warn:true});
}
/* De knoppen van het gesprek worden per venster aangesloten; zie `wireNote`. */
/* Zonder uitschrijfdienst is het geluid het enige wat er is; dat mag niet
   met het venster verdwijnen. Downloaden dus, met de sessienaam erin. */
function saveTalkAudio(){
  if(!talkAudioBlob) return;
  const stamp=new Date().toISOString().slice(0,16).replace(/[:T]/g,"-");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(talkAudioBlob);
  a.download=(el("sess").value||"tafel")+"-gesprek-"+stamp+
             (talkAudioBlob.type.includes("mp4")?".m4a":".webm");
  a.click();
}

/* ═══════════════════════════════════════════════════════════════
   5. FRAME
   ═══════════════════════════════════════════════════════════════ */
const cv=el("c"), ctx=cv.getContext("2d");
const mapLayer=document.createElement("canvas"), mapCtx=mapLayer.getContext("2d");
/* Een ruime rand laat het bestaande kaartbeeld een flink stuk reizen voordat
   er nieuwe tegels opgebouwd hoeven te worden. 384 px blijft ook op de NUC
   een redelijke hoeveelheid beeldgeheugen. */
const MAP_PAD=384;
let W=0,H=0,lastUI=0,mapRenderKey="",mapSnapshot=null;
let mapLastViewKey="",mapLastMove=0,mapLastRender=0;
function resize(){
  const dpr=Math.min(devicePixelRatio||1,3);
  // De kaart is fotomateriaal en heeft weinig aan drie fysieke pixels per
  // schermpixel. De bediening blijft op volle resolutie; alleen de zware
  // kaartbuffer krijgt deze bovengrens.
  const mapDpr=Math.min(devicePixelRatio||1,1.5);
  W=innerWidth;H=innerHeight; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  mapLayer.width=(W+MAP_PAD*2)*mapDpr; mapLayer.height=(H+MAP_PAD*2)*mapDpr;
  mapCtx.setTransform(mapDpr,0,0,mapDpr,0,0);
  mapRenderKey=""; mapSnapshot=null; mapLastViewKey="";
  ctx.imageSmoothingQuality="high";
  mapCtx.imageSmoothingQuality="high";
  pxPerMM=Math.hypot(W,H)/(CFG.screenDiagIn*25.4);
}
addEventListener("resize",resize);

function paintMapLayer(now){
  const bgKey=bgImage?[bgImage.west,bgImage.east,bgImage.north,bgImage.south].join(","):"none";
  const baseKey=[W,H,MV.set,MV.north,bgKey,calmMap,colorTheme].join("|");
  const viewKey=[MV.lng.toFixed(7),MV.lat.toFixed(7),MV.zoom.toFixed(5)].join("|");
  const key=[baseKey,viewKey,tileRevision].join("|");
  if(viewKey!==mapLastViewKey){ mapLastViewKey=viewKey; mapLastMove=now; }

  let scale=1,anchor={x:W/2,y:H/2},drift=Infinity;
  if(mapSnapshot){
    scale=Math.pow(2,MV.zoom-mapSnapshot.zoom);
    anchor=MV.project(mapSnapshot.lng,mapSnapshot.lat);
    drift=Math.hypot(anchor.x-W/2,anchor.y-H/2);
  }
  const baseChanged=!mapSnapshot||mapSnapshot.baseKey!==baseKey||!mapRenderKey;
  const room=Math.max(0,Math.min(((W+MAP_PAD*2)*scale-W)/2,
                                 ((H+MAP_PAD*2)*scale-H)/2));
  /* Inzoomen vergroot de reserve vanzelf. Bij uitzoomen of ver reizen bouwen
     we pas opnieuw op als die reserve echt bijna op is; eerder vernieuwen gaf
     midden in een draai telkens een korte blokkade. */
  const beyondBuffer=mapSnapshot&&(drift>Math.max(8,room-24)||room<8);
  const settled=now-mapLastMove>160;
  /* Tijdens een beweging alleen opnieuw opbouwen als de reserve rondom het
     scherm bijna op is. Anders wachten tot de hand 120 ms stil is. Nieuwe
     tegels mogen tijdens een lange reis af en toe doorstromen, maar niet bij
     ieder afzonderlijk onload-bericht. */
  if(baseChanged||beyondBuffer||(key!==mapRenderKey&&settled)){
    drawMap(mapCtx,MAP_PAD);
    mapSnapshot={lng:MV.lng,lat:MV.lat,zoom:MV.zoom,north:MV.north,
                 baseKey,tileRevision};
    mapRenderKey=key; mapLastRender=now;
    scale=1; anchor={x:W/2,y:H/2};
  }

  // Eén grote kopie met een transformatie is goedkoop voor de compositor en
  // blijft daardoor vloeiend, ook als de tegelopbouw maar enkele keren per
  // seconde klaar kan zijn.
  ctx.save();
  ctx.imageSmoothingQuality=settled?"high":"low";
  ctx.translate(anchor.x,anchor.y); ctx.scale(scale,scale);
  ctx.drawImage(mapLayer,0,0,mapLayer.width,mapLayer.height,
                -W/2-MAP_PAD,-H/2-MAP_PAD,W+MAP_PAD*2,H+MAP_PAD*2);
  ctx.restore();
}

/* Het diagnosepaneel. Leesbaar vanaf een meter, want je staat bij de tafel met
   een puck in je hand: hoeveel punten het glas meldt, hoe vaak er de laatste
   vijf seconden een puck stond, en van de laatste ringmeting de maat, de
   spreiding en hoe goed elk van de vier sjablonen paste. Daarmee is te zien
   wat er misgaat: geen punten (het glas ziet de pootjes niet), een straal die
   niet klopt (schermdiagonaal verkeerd ingesteld), of twee sjablonen die te
   dicht bij elkaar liggen (dubbelzinnig). */
const diagHist=[];
function drawPuckDiag(ctx,points,pucks,now){
  diagHist.push({t:now,n:points.length,p:pucks.length});
  while(diagHist.length&&now-diagHist[0].t>5000) diagHist.shift();
  const gezien=diagHist.filter(h=>h.p>0).length/Math.max(1,diagHist.length);
  const rij=[];
  rij.push(`punten ${points.length} \u00b7 pucks ${pucks.length}`);
  rij.push(`puck in beeld: ${(gezien*100).toFixed(0)}% van de laatste 5 s`);
  if(ringDiag){
    rij.push(`ring: ${ringDiag.legs} punten \u00b7 straal ${ringDiag.mm.toFixed(1)} mm`);
    rij.push(`spreiding ${ringDiag.spread.toFixed(3)} (max 0,16)`);
    for(const b of ringDiag.lijst) rij.push(`   ${b.naam}: ${b.err.toFixed(1)}\u00b0`);
    rij.push(`grens ${CFG.ringToleranceDeg}\u00b0 \u00b7 marge ${CFG.ringMarginDeg}\u00b0`);
  } else rij.push("geen vijftal op \u00e9\u00e9n cirkel gevonden");
  const F=14, LH=20, pad=12;
  ctx.save();
  ctx.font=`${F}px 'JetBrains Mono',ui-monospace,monospace`;
  ctx.textAlign="left"; ctx.textBaseline="top";
  const w=Math.max(...rij.map(r=>ctx.measureText(r).width))+pad*2;
  const h=rij.length*LH+pad*2;
  ctx.fillStyle="rgba(7,9,12,.82)";
  ctx.strokeStyle="rgba(232,237,244,.25)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(16,16,w,h,10); ctx.fill(); ctx.stroke();
  rij.forEach((r,i)=>{
    ctx.fillStyle=i<2?"#e8edf4":"#9aa7b8";
    ctx.fillText(r,16+pad,16+pad+i*LH);
  });
  ctx.restore();
}
function frame(){
  requestAnimationFrame(frame);
  const now=performance.now();
  /* Eerst de invoer verwerken. Voorheen werd de kaart getekend en pas daarna
     verplaatst; dat gaf bij iedere beweging een voelbaar beeld vertraging. */
  syncSimPucksToMap();
  const points=[...realTouches.values(),...(simMode?simPads():[])];
  const {pucks:dets,usedIdx}=recognise(points);
  const pucks=track(dets,now);
  if(learn.open) updateLearn(now);

  paintMapLayer(now);
  if(bakePending){ bakePending=false; bakeMap(); }
  drawGaps(ctx,MV,W,H);
  drawKG(ctx,MV,W,H);

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
    if(p.title||p.description||p.note){ ctx.fillStyle="#07090c"; ctx.font="700 11px "+CHIP_FAMILY; ctx.textAlign="center";
                ctx.fillText("•",s.x,s.y+3.5); }
    if(noteViewFor(p)){ ctx.beginPath(); ctx.arc(s.x,s.y,24,0,Math.PI*2);
      ctx.strokeStyle="#e8edf4"; ctx.lineWidth=1.5; ctx.stroke(); }
  }

  for(const t of pucks){
    const c=vColor(t.tpl.verdict), R=CFG.puckRadiusMM*pxPerMM;
    const items=ringItems(t), n=items.length;
    const chosen=ringChosen(t), glow=puckTapGlow(t,now);
    syncPlacedPinTopic(t);
    ctx.save(); ctx.globalAlpha=t.state==="incomplete"?0.35:1;
    // De ring staat er alleen als iemand erom gevraagd heeft, met een tik in
    // het kijkgat. Anders ligt er niets van de puck over de kaart heen: dat is
    // de rusttoestand, waarin schuiven en draaien de kaart bedienen, en daar
    // hoort geen menu bij dat je met een duw per ongeluk raakt.
    for(let k=0;t.ring&&k<n;k++){
      const item=items[k], off=item.disabled;
      const a0=ringStart(n)+(k/n)*Math.PI*2+0.03, a1=ringStart(n)+((k+1)/n)*Math.PI*2-0.03;
      // Twee standen op de ring, en ze moeten van een meter afstand uit elkaar
      // te houden zijn: wat er gekozen ís (vol en dik) en wat er verder te
      // kiezen valt (dun). Uitgeschakeld is niet onzichtbaar maar flauw: je
      // moet kunnen zien dat de optie bestaat.
      ctx.beginPath(); ctx.arc(t.x,t.y,CFG.ringPX,a0,a1);
      ctx.strokeStyle=off?c+"18":(k===chosen?c:c+"44");
      ctx.lineWidth=off?2:(k===chosen?7:4);
      ctx.stroke();
      // De aangetikte optie licht kort wit op. Kiezen is nu één tik, dus dit
      // is het enige moment waarop de tafel terugzegt dat hij je gehoord heeft.
      if(k===t.tapIdx&&glow>0){
        ctx.beginPath(); ctx.arc(t.x,t.y,CFG.ringPX,a0,a1);
        ctx.strokeStyle="rgba(255,255,255,"+(glow*0.9).toFixed(3)+")";
        ctx.lineWidth=9; ctx.stroke();
      }
      const am=(a0+a1)/2, lr=CFG.ringPX+chipHeight()*0.85;
      const lx=t.x+Math.cos(am)*lr, ly=t.y+Math.sin(am)*lr;
      // Er is nog maar één bijzondere stand — de gekozen optie. De wijzer die
      // liet zien waar je heen draaide is weg, dus "aangewezen" bestaat niet meer.
      const selected=k===chosen&&!off;
      const label=item.label;
      // Dezelfde chip als een knop in een paneel: zelfde maat, zelfde hoeken.
      // Wat gekozen is verschilt in rand en vulling, niet in formaat — een
      // label dat groeit zodra je erlangs draait laat de hele ring dansen.
      ctx.font=(selected?"700 ":"600 ")+CHIP.font.toFixed(1)+"px "+CHIP_FAMILY;
      ctx.textAlign="center"; ctx.textBaseline="middle";

      // Keep the option legible over detailed map tiles. A compact opaque label
      // also makes the active option much easier to spot from across the table.
      const labelW=Math.ceil(ctx.measureText(label).width)+CHIP.padX*2;
      const labelH=chipHeight();
      ctx.beginPath();
      ctx.roundRect(lx-labelW/2,ly-labelH/2,labelW,labelH,Math.min(CHIP.radius,labelH/2));
      ctx.fillStyle=selected?"rgba(9,12,17,.98)":"rgba(9,12,17,.88)";
      ctx.fill();
      ctx.strokeStyle=off?"rgba(232,237,244,.12)":(selected?c:"rgba(232,237,244,.28)");
      ctx.lineWidth=selected?2:1;
      ctx.stroke();
      ctx.fillStyle=off?"rgba(232,237,244,.32)":(selected?"#ffffff":"rgba(232,237,244,.9)");
      ctx.fillText(label,lx,ly+.5);
      // Hetzelfde oplichten op het label, want daar stond de vinger.
      if(k===t.tapIdx&&glow>0){
        ctx.beginPath();
        ctx.roundRect(lx-labelW/2,ly-labelH/2,labelW,labelH,Math.min(CHIP.radius,labelH/2));
        ctx.strokeStyle="rgba(255,255,255,"+(glow*0.95).toFixed(3)+")";
        ctx.lineWidth=3; ctx.stroke();
      }
    }
    /* Hier stond een wijzer op de gemeten hoek: die liet zien naar welke optie
       je aan het draaien was. Nu je kiest door te tikken wijst de puck nergens
       meer naar, en een naald die naar een segment wijst zou juist suggereren
       dat draaien nog iets doet. */
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
    // De puck is een ring, geen schijf: in het hart zit een kijkgat, zodat de
    // kaart onder het vizier zichtbaar blijft. Je ziet dus precies waar je
    // aanwijst terwijl je richt, in plaats van erop te moeten gokken.
    const hole=R*PUCK_HOLE;
    ctx.fillStyle="rgba(9,12,17,.94)";
    ctx.beginPath();
    ctx.arc(t.x,t.y,R,0,Math.PI*2);
    ctx.arc(t.x,t.y,hole,0,Math.PI*2,true);
    ctx.fill();
    // De buitenrand draagt de kleur van het oordeel en moet van een meter
    // afstand af te lezen zijn, dus hij is fors; hij ligt binnen R zodat de
    // puckstraal blijft kloppen.
    ctx.strokeStyle=c; ctx.lineWidth=Math.max(3,R*0.055);
    ctx.beginPath(); ctx.arc(t.x,t.y,R-ctx.lineWidth/2,0,Math.PI*2); ctx.stroke();
    // Een dunne rand rond het gat houdt de overgang naar de kaart rustig.
    ctx.strokeStyle=c+"66"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(t.x,t.y,hole,0,Math.PI*2); ctx.stroke();
    // Het hart van de puck blijft vrij voor het vizier; de teksten wijken uit.
    drawTarget(ctx,t.x,t.y,c,R);
    // Het gat is groter dan de teksten aankunnen, dus die staan nu midden in de
    // zwarte band tussen gat en rand.
    const band=(hole+R)/2;
    // De teksten op de puck horen bij de puck, niet bij een venster: ze schalen
    // dus met zijn straal en niet met de bedieningsschaal.
    const nameSize=Math.max(12,R*0.17), lineSize=Math.max(9,R*0.115);
    ctx.textAlign="center"; ctx.fillStyle=c; ctx.font="600 "+nameSize.toFixed(1)+"px "+CHIP_FAMILY;
    ctx.fillText(vName(t.tpl.verdict),t.x,t.y-band+nameSize*0.34);
    // Beide regels staan in de onderste helft van de band, niet in het gat:
    // in het gat ligt de kaart en het vizier, en daar is geen tekst leesbaar.
    ctx.font="500 "+lineSize.toFixed(1)+"px "+CHIP_FAMILY; ctx.fillStyle="rgba(232,237,244,.62)";
    // Staat de puck in de zoomstand, dan staan er twee regels in die band en
    // schuiven ze om het midden uit elkaar; anders staat deze regel alleen.
    const bandH=R-hole;
    // Eén regel, en die zegt wat er nú te doen valt: staat de ring open, dan
    // kies je een thema; staat hij dicht, dan wijst de regel naar het kijkgat
    // (of meldt dat deze puck zijn markering al heeft). Twee regels onder
    // elkaar is in die smalle band te druk.
    ctx.fillText(t.ring?tr("puckPickTopic")
                       :(t.armed?tr(tableUi()?"confirmTouch":"confirmMouse"):tr("placed")),
                 t.x,t.y+band+bandH*0.12);
    ctx.restore();
  }

  drawNoteTether(ctx,pucks);
  drawLockBadge(ctx);
  drawResetProgress(ctx,now);

  if(debugMode){
    points.forEach((pt,i)=>{
      ctx.strokeStyle=usedIdx.has(i)?"#39d8a4":"#ff5f56"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,16,0,Math.PI*2); ctx.stroke();
      ctx.font="10px 'JetBrains Mono',ui-monospace,monospace"; ctx.textAlign="left"; ctx.fillStyle=ctx.strokeStyle;
      ctx.fillText((pt.sim?"sim ":"id ")+i,pt.x+20,pt.y+3);
    });
    drawPuckDiag(ctx,points,pucks,now);
  }

  if(now-lastUI>150){ lastUI=now; updateUI(pucks); }
}

/* ═══════════════════════════════════════════════════════════════
   6. UI
   ═══════════════════════════════════════════════════════════════ */
/* Wat er tijdens een sessie doorlopend moet gebeuren is weinig: de kaart
   tekent zichzelf en de pucks staan op tafel. De teller en de lijst met
   laatste markeringen stonden hier ook, maar dat is de opbrengst en geen
   bediening — die worden nu pas opgebouwd als iemand de sessie-analyse
   openslaat. Scheelt bij elke beweging acht regels HTML opnieuw opbouwen. */
function updateUI(pucks){
  /* De aardingswaarschuwing is installatietaal ("check de aarding") en hoort
     bij het ijken van de tafel, niet bij het gesprek eromheen. */
  const flag=el("flag"), ground=DEV&&realTouches.size>=3&&!pucks.length;
  // Een volle opslag gaat voor: dat kost iemand zijn bijdrage, de aarding
  // kost hooguit een meting.
  if(storageFull){ flag.style.display="block"; flag.innerHTML=tr("storageFull"); }
  else{ flag.style.display=ground?"block":"none"; if(ground) flag.textContent=tr("groundFlag"); }
  /* De analyse bouwde zichzelf 6x per seconde opnieuw op: knoppen verdwenen
     onder een trage vinger vandaan en de lijst sprong terug naar boven terwijl
     je las. Nu alleen als er werkelijk iets veranderd is. */
  if(el("analytics").classList.contains("open") && analyticsRevision!==pinsRevision){
    analyticsRevision=pinsRevision; renderAnalytics();
  }
}
let analyticsRevision=-1;

/* De laatste markeringen, met een kruisje per regel om er één weg te halen.
   Staat in het analysevenster: daar lees je na wat er ligt, en daar hoort
   het opruimen dus ook. */
function renderRecent(){
  const safe=s=>String(s||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  const box=el("recentBody");
  box.innerHTML=pins.length?pins.slice(-8).reverse().map(p=>
    `<div class="pin"><i style="background:${vColor(p.verdict)}"></i>
     <div><b>${safe(p.title)||tr("untitled")} - ${safe(p.topic)}</b>
     ${(p.description||p.note)?`<div class="description">${safe(p.description||p.note)}</div>`:""}
     <div class="meta">${vName(p.verdict)} · ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · ${p.t.slice(11,16)}</div></div>
     <span class="del" data-id="${p.id}">✕</span></div>`).join("")
    :`<p class="empty">${tr("noMarks")}</p>`;
  [...box.querySelectorAll(".del")].forEach(b=>b.onclick=()=>{
    const i=pins.findIndex(p=>p.id===b.dataset.id); if(i>=0){pins.splice(i,1);save();renderAnalytics();}
  });
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
  renderRecent();
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
  closeMenu(); closeNotes(); analyticsRevision=pinsRevision; renderAnalytics(); applyAnalyticsOrientation();
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
/* Een vastgezette kaart had alleen een spoor in het menu — dus in het enige
   venster dat je sluit voordat je de kaart aanraakt. Wie hem daarna niet meer
   kan verschuiven, denkt dat de tafel hangt. Een rand om het beeld en een chip
   aan beide lange zijden zeggen het zonder woorden in de weg te leggen. */
function drawLockBadge(ctx){
  if(!mapLocked) return;
  const label=tr("locked");
  ctx.save();
  ctx.setLineDash([9,7]);
  ctx.strokeStyle="rgba(255,209,102,.55)"; ctx.lineWidth=2;
  ctx.strokeRect(7,7,W-14,H-14);
  ctx.setLineDash([]);
  ctx.font="600 "+CHIP.font.toFixed(1)+"px "+CHIP_FAMILY;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  const h=chipHeight(), w=Math.ceil(ctx.measureText(label).width)+CHIP.padX*2;
  const chip=(x,y,turn)=>{
    ctx.save(); ctx.translate(x,y); if(turn) ctx.rotate(Math.PI);
    ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,Math.min(CHIP.radius,h/2));
    ctx.fillStyle="rgba(9,12,17,.9)"; ctx.fill();
    ctx.strokeStyle="rgba(255,209,102,.7)"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle="#ffd166"; ctx.fillText(label,0,0.5);
    ctx.restore();
  };
  chip(W/2,H-16-h/2,false);
  if(sidesActive()) chip(W/2,16+h/2,true);
  ctx.restore();
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
  ["1","2","3","4","5","6","7","8","9","0"],
  ["close","@",",","space",".","-","enter"]
];
/* Twee toetsenborden, één per tafelkant. Eén toetsenbord onderaan is voor wie
   aan de overkant staat onbereikbaar én ondersteboven, en zolang het er één
   was moesten twee mensen om de beurt typen. Elk toetsenbord onthoudt zijn
   eigen veld en zijn eigen shift, dus ze zitten elkaar niet in de weg. */
const keyboards=[];
const kbPart=(kb,id)=>document.getElementById(id+kb.suffix);
const kbOnSide=side=>keyboards.find(k=>k.side===side)||keyboards[0];
const kbVisible=kb=>kb.el.classList.contains("visible");
function buildKeyboards(){
  for(const side of ["a","b"]){
    const suffix=side==="a"?"":"-b";
    const root=side==="a"?el("keyboard"):cloneWithSuffix(el("keyboard"),suffix);
    if(side!=="a") document.body.appendChild(root);
    // De overkant staat op zijn kop en bovenaan; dat is vast, niet per veld.
    root.classList.toggle("flipped",side==="b");
    const kb={side,suffix,el:root,target:null,shift:false};
    keyboards.push(kb);
    wireKeyboard(kb);
  }
}
/* Aan welke kant hoort dit veld? Een veld in een venster hoort bij de kant van
   dat venster, een veld in het menu bij de kant waar het menu openstaat. */
function keyboardSideFor(target){
  if(!sidesActive()) return "a";
  const v=noteViewOf(target);
  if(v) return v.side;
  if(target.closest("#menu")) return menuFlipped()?"b":"a";
  return "a";
}
const keyboardLabel=key=>({shift:"⇧",backspace:"⌫",space:tr("keySpace"),enter:tr("keyEnter"),close:tr("keyClose")})[key]||key;
function renderKeyboard(kb){
  if(!kb){ for(const k of keyboards) renderKeyboard(k); return; }
  kbPart(kb,"keyboardKeys").innerHTML=KEY_ROWS.map(row=>`<div class="keyboard-row">${row.map(key=>{
    const wide=["shift","backspace","enter","close"].includes(key)?" key-wide":"";
    const space=key==="space"?" key-space":"";
    const active=key==="shift"&&kb.shift?" key-active":"";
    const label=/^[a-z]$/.test(key)&&kb.shift?key.toUpperCase():keyboardLabel(key);
    return `<button type="button" class="${wide}${space}${active}" data-key="${key}">${label}</button>`;
  }).join("")}</div>`).join("");
}
function keyboardFields(){
  return [...document.querySelectorAll('input[type="text"],input:not([type]),textarea')];
}
function refreshKeyboardFields(){
  keyboardFields().forEach(field=>{
    field.classList.add("touch-type");
    if(tableUi()) field.setAttribute("inputmode","none");
    else field.removeAttribute("inputmode");
  });
}
/* Het venster waarin getypt wordt boven zijn eigen toetsenbord houden. */
function liftEditorAboveKeyboard(kb){
  const v=kb?.target?noteViewOf(kb.target):null;
  if(!v||!v.pin||!kbVisible(kb)) return;
  const n=v.el;
  const nr=n.getBoundingClientRect(), kr=kb.el.getBoundingClientRect();
  const flip=v.flip;
  // Het toetsenbord staat aan dezelfde kant als de persoon: onderaan voor wie
  // vooraan staat, bovenaan voor wie aan de overkant staat. Het venster wijkt
  // dus de andere kant op.
  let top=null;
  if(flip && nr.top<kr.bottom+12) top=Math.min(innerHeight-nr.height-12,kr.bottom+12);
  else if(!flip && nr.bottom>kr.top-12) top=Math.max(12,kr.top-nr.height-12);
  if(top===null) return;
  n.style.top=(Math.max(12,top)/uiScale)+"px";
}
function showKeyboard(target){
  // Niet op `uiMode==="touch"` testen: `refreshKeyboardFields` zet het
  // systeemtoetsenbord uit voor elke tafelstand, dus moet dit toetsenbord in
  // diezelfde standen verschijnen. Anders kun je in de puckstand niets typen.
  if(!tableUi()||!target.classList.contains("touch-type")) return;
  // Het toetsenbord staat aan de kant waar getypt wordt; zie keyboardSideFor.
  const kb=kbOnSide(keyboardSideFor(target));
  // Hetzelfde veld kan niet aan twee toetsenborden tegelijk hangen.
  for(const other of keyboards) if(other!==kb&&other.target===target) hideKeyboard(other);
  kb.target=target;
  kbPart(kb,"keyboardField").textContent=target.labels?.[0]?.textContent||target.placeholder||tr("typeHere");
  renderKeyboard(kb);
  kb.el.classList.add("visible");
  document.body.classList.add("keyboard-open");
  requestAnimationFrame(()=>liftEditorAboveKeyboard(kb));
  setTimeout(()=>liftEditorAboveKeyboard(kb),360);
}
function hideKeyboard(kb,blur=false){
  if(!kb) return;
  kb.el.classList.remove("visible");
  if(blur&&kb.target) kb.target.blur();
  kb.target=null; kb.shift=false;
  document.body.classList.toggle("keyboard-open",keyboards.some(kbVisible));
}
function hideKeyboards(blur=false){ for(const kb of keyboards) hideKeyboard(kb,blur); }
/* Alles wat in dit stuk scherm getypt werd is weg; het bijbehorende
   toetsenbord hoort mee te verdwijnen. */
function hideKeyboardIn(root){
  if(!root) return;
  for(const kb of keyboards) if(kb.target&&root.contains(kb.target)) hideKeyboard(kb,true);
}
function insertKeyboardText(kb,text){
  const target=kb?.target; if(!target) return;
  const start=target.selectionStart??target.value.length, end=target.selectionEnd??start;
  target.setRangeText(text,start,end,"end");
  target.dispatchEvent(new Event("input",{bubbles:true}));
  target.focus({preventScroll:true});
}
function wireKeyboard(kb){
  kb.el.addEventListener("pointerdown",e=>{if(e.target.closest("button")) e.preventDefault();});
  kb.el.addEventListener("click",e=>{
    const button=e.target.closest("button[data-key]"); if(!button||!kb.target) return;
    const key=button.dataset.key;
    if(key==="shift"){kb.shift=!kb.shift;renderKeyboard(kb);return;}
    if(key==="close"){hideKeyboard(kb,true);return;}
    if(key==="backspace"){
      const target=kb.target, start=target.selectionStart??target.value.length, end=target.selectionEnd??start;
      if(start!==end) target.setRangeText("",start,end,"end");
      else if(start>0) target.setRangeText("",start-1,start,"end");
      target.dispatchEvent(new Event("input",{bubbles:true})); return;
    }
    if(key==="enter"){
      const v=noteViewOf(kb.target);
      if(kb.target.tagName==="TEXTAREA") insertKeyboardText(kb,"\n");
      else if(v&&kb.target===notePart(v,"noteTitle")){ notePart(v,"noteText").focus(); }
      else{
        kb.target.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
        kb.target.dispatchEvent(new Event("change",{bubbles:true}));
        hideKeyboard(kb,true);
      }
      return;
    }
    insertKeyboardText(kb,key==="space"?" ":kb.shift?key.toUpperCase():key);
    if(kb.shift){kb.shift=false;renderKeyboard(kb);}
  });
}
buildKeyboards();
addEventListener("focusin",e=>{if(e.target.classList?.contains("touch-type")) showKeyboard(e.target);});

/* Twee regels tekst gaan over de balk onderaan, en die is er in de puckstand
   niet. Ze staan hier bij elkaar omdat zowel het wisselen van stand als het
   wisselen van taal ze opnieuw moet zetten. */
function refreshModeTexts(){
  [...document.querySelectorAll(".puck-hint")].forEach(h=>
    h.textContent=uiMode==="laptop"?tr("laptopHint"):tr("touchHint"));
  el("sidesHint").textContent=tr(puckMode()?"sidesHintPuck":"sidesHint");
}
function applyMode(mode){
  uiMode=mode;
  /* `mode-touch` gaat over de maat van de bediening en geldt daarom ook voor de
     puckstand: dat is ook een tafel. Wat de puckstand apart maakt -- de balk
     weg, een toevoegknop op die plek -- hangt aan `mode-puck`. */
  document.body.classList.toggle("mode-touch",mode!=="laptop");
  document.body.classList.toggle("mode-laptop",mode==="laptop");
  document.body.classList.toggle("mode-puck",mode==="puck");
  // De schaal hoort bij de stand; hij wordt per stand onthouden.
  uiScale=storedUiScale(); applyScale();
  [["modeTouch","touch"],["modeLaptop","laptop"],["modePuck","puck"]].forEach(([id,value])=>{
    const active=value===mode;
    el(id).classList.toggle("active",active);
    el(id).setAttribute("aria-pressed",String(active));
  });
  refreshNoteFlipLabels();
  refreshModeTexts();
  refreshKeyboardFields();
  // Een venster dat op zijn kop staat hoort niet mee te verhuizen naar de
  // laptopstand, dus dat gaat dicht bij het wisselen.
  applySides();
  closeNotes();
  if(mode==="laptop") hideKeyboards();
  /* Sleepkopieen horen bij de balk. Gaat de balk weg, dan gaan zij mee: anders
     blijft er een puck op tafel liggen die nergens meer op te pakken is. */
  if(mode==="puck") clearPucks();
  try{localStorage.setItem("pucktable-ui-mode",mode);}catch(e){}
  resize();
}

function applyColorTheme(theme){
  colorTheme=theme==="light"?"light":"dark";
  document.documentElement.dataset.theme=colorTheme;
  document.documentElement.style.colorScheme=colorTheme;
  [["themeLight","light"],["themeDark","dark"]].forEach(([id,value])=>{
    const active=value===colorTheme;
    el(id).classList.toggle("active",active);
    el(id).setAttribute("aria-pressed",String(active));
  });
  try{ localStorage.setItem("pucktable-color-theme",colorTheme); }catch(e){}
  // De vaste kaartlaag wordt gecachet; na een themawissel moet ook de lege
  // achtergrond, het raster en de schaalbalk opnieuw geschilderd worden.
  mapRenderKey="";
}
el("themeLight").onclick=()=>applyColorTheme("light");
el("themeDark").onclick=()=>applyColorTheme("dark");

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
el("btnCalm").onclick=()=>{calmMap=!calmMap;applyCalm();};
el("btnResetKey").onclick=()=>{ resetLearning=!resetLearning; applyResetKey(); };
el("btnMoveDots").onclick=()=>{pinMoveMode=!pinMoveMode;closeNotes();applyPinMoveMode();};
function applyScale(){
  document.documentElement.style.setProperty("--ui-scale",String(uiScale));
  el("scaleVal").textContent=Math.round(uiScale*100)+"%";
  const i=UI_SCALES.indexOf(uiScale);
  el("btnScaleDown").disabled=i<=0;
  el("btnScaleUp").disabled=i>=UI_SCALES.length-1;
  readChip();
  try{localStorage.setItem("pucktable-ui-scale-"+uiMode,String(uiScale));}catch(e){}
  // Een open venster hangt aan een punt op de kaart; dat punt verschuift niet
  // mee, dus beide vensters gaan opnieuw langs hun anker liggen.
  for(const v of openNotes()){ positionNoteX(v); positionNote(v); }
  positionKgInfo();
  refreshPanelOffsets();
}
function stepScale(step){
  const i=UI_SCALES.indexOf(uiScale);
  uiScale=UI_SCALES[Math.max(0,Math.min(UI_SCALES.length-1,(i<0?2:i)+step))];
  applyScale();
}
el("btnScaleDown").onclick=()=>stepScale(-1);
el("btnScaleUp").onclick=()=>stepScale(1);

/* ── Panelen verslepen ────────────────────────────────────────────────
   Aan een tafel staat iedereen ergens anders, en een paneel dat voor de een
   goed ligt, ligt voor de ander midden over het stuk kaart waar het gesprek
   over gaat. Elk zwevend paneel kan daarom opzij geschoven worden — aan zijn
   kop, zodat een veeg in het paneel zelf gewoon een veeg blijft.

   De verplaatsing zit in de losse `translate`-eigenschap en niet in
   `transform`: het draaien voor de overkant en het kantelen van de bediening
   staan in `transform` en blijven zo overeind. `translate` wordt vóór de
   rotatie toegepast, dus een paneel schuift altijd de kant op die de vinger
   gaat, ook als het op zijn kop staat.

   De offsets worden bewust niet bewaard: na een verversing staat de tafel
   weer klaar zoals hij bedoeld is. Dubbeltikken op de greep zet één paneel
   terug. */
const DRAG_PANELS=[
  /* Het uitgeklapte menu mag opzij; alleen de vier hoekknoppen waarmee het
     opent blijven als vaste ankers van de tafelbediening staan. */
  {id:"menu",       head:".menu-head"},
  {id:"note",       head:".note-head"},
  {id:"keyboard",   head:".keyboard-head"},
  {id:"puckDock",   head:".puck-dock-head"},
  {id:"puckDockTop",head:".puck-dock-head"},
  {id:"zoom"},                      // greep als eerste rij boven de knoppen
  {id:"kgInfo",  loose:true},
];
const PANEL_SNAP_DISTANCE=72;        // schermpixels rond de beginpositie
const panelOffsets=new Map();        // element → {x,y} in schermpixels
let panelDragEnd=0;

/* De offset staat in schermpixels, maar `translate` rekent in de eenheden van
   het paneel zelf — en dat staat op `zoom`. Vandaar de deling: anders zou een
   paneel bij het groter maken van de bediening ook verder wegschuiven. */
function applyPanelOffset(panel){
  const o=panelOffsets.get(panel);
  if(!o||(!o.x&&!o.y)){ panel.style.translate=""; panel.classList.remove("moved"); return; }
  panel.style.translate=(o.x/uiScale)+"px "+(o.y/uiScale)+"px";
  panel.classList.add("moved");
}
/* Een paneel mag van de kaart af geschoven worden, maar nooit zó ver dat er
   niets meer over is om het mee terug te halen. */
function clampPanel(panel){
  const o=panelOffsets.get(panel); if(!o) return;
  const prev=panel.style.translate;
  panel.style.translate="";
  const r=panel.getBoundingClientRect();          // plek zonder verplaatsing
  panel.style.translate=prev;
  if(!r.width||!r.height) return;
  const keepX=Math.min(64,r.width*.6), keepY=Math.min(64,r.height*.9);
  o.x=Math.max(keepX-r.left-r.width, Math.min(innerWidth -keepX-r.left, o.x));
  o.y=Math.max(keepY-r.top -r.height, Math.min(innerHeight-keepY-r.top , o.y));
}
function resetPanelOffset(panel){
  if(!panel) return;
  panelOffsets.delete(panel);
  panel.classList.remove("snap-home");
  applyPanelOffset(panel);
}
function refreshPanelOffsets(){
  for(const panel of panelOffsets.keys()){ clampPanel(panel); applyPanelOffset(panel); }
}
addEventListener("resize",refreshPanelOffsets);

const dragControl=t=>!!t.closest("button,input,select,textarea,a,label,.traypuck");

function startPanelDrag(panel,zone,e){
  if(e.button>0) return;
  const o=panelOffsets.get(panel)||{x:0,y:0};
  panelOffsets.set(panel,o);
  const sx=e.clientX, sy=e.clientY, ox=o.x, oy=o.y;
  let moved=false;
  try{ zone.setPointerCapture(e.pointerId); }catch(err){}
  panel.classList.add("dragging");
  const move=ev=>{
    if(ev.pointerId!==e.pointerId) return;
    o.x=ox+ev.clientX-sx; o.y=oy+ev.clientY-sy;
    if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>4) moved=true;
    clampPanel(panel); applyPanelOffset(panel);
    panel.classList.toggle("snap-home",Math.hypot(o.x,o.y)<=PANEL_SNAP_DISTANCE);
  };
  const stop=ev=>{
    if(ev.pointerId!==e.pointerId) return;
    zone.removeEventListener("pointermove",move);
    zone.removeEventListener("pointerup",stop);
    zone.removeEventListener("pointercancel",stop);
    panel.classList.remove("dragging");
    if(moved){
      panelDragEnd=performance.now();
      if(Math.hypot(o.x,o.y)<=PANEL_SNAP_DISTANCE){
        /* Eerst één frame op de loslaatplek vastleggen. Daarna kan de
           transition zichtbaar van die plek naar de oorsprong lopen. */
        panel.getBoundingClientRect();
        resetPanelOffset(panel);
      }
      else panel.classList.remove("snap-home");
    }
  };
  zone.addEventListener("pointermove",move);
  zone.addEventListener("pointerup",stop);
  zone.addEventListener("pointercancel",stop);
  e.preventDefault(); e.stopPropagation();
}
/* De greep van de hoekknoppen zit ín een knop. Slepen mag daar dus niet ook
   nog het menu openen; een tik zonder verplaatsing wél. */
addEventListener("click",e=>{
  if(performance.now()-panelDragEnd<300){ e.stopPropagation(); e.preventDefault(); }
},true);

function makeDraggable(panel,headSel,loose){
  panel.classList.add("panel-draggable");
  const head=headSel?panel.querySelector(headSel):null;
  if(head) head.classList.add("drag-head");
  let grip=null;
  /* Een bestaande kop is zelf de greep; daar hoeft geen extra icoon naast.
     Alleen een paneel zonder kop krijgt een lege sleepstrook. */
  if(!head){
    grip=document.createElement("div");
    grip.className="panel-grip"+(loose?" loose":"");
    grip.dataset.i18nTitle="movePanel"; grip.dataset.i18nAria="movePanel";
    grip.title=tr("movePanel"); grip.setAttribute("aria-label",tr("movePanel"));
    panel.insertBefore(grip,panel.firstChild);
  }
  for(const zone of head?[head]:[grip]){
    zone.addEventListener("pointerdown",ev=>{
      if(head && dragControl(ev.target)) return;          // knop blijft knop
      startPanelDrag(panel,zone,ev);
    });
    zone.addEventListener("dblclick",()=>resetPanelOffset(panel));
  }
}
for(const {id,head,loose} of DRAG_PANELS){
  const panel=el(id);
  if(panel) makeDraggable(panel,head,loose);
  // De klonen aan de overkant zijn dezelfde panelen en schuiven dus net zo.
  const twin=el(id+"-b");
  if(twin) makeDraggable(twin,head,loose);
}

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

/* ── Volledig scherm ─────────────────────────────────────────────────────
   Alleen de browserbalk. De gebaren van de bureaubladomgeving — drie vingers
   die een werkblad wegschuiven — zitten vóór de browser en gaan hier níét mee
   weg; daarvoor is deploy/KIOSK.md. */
function refreshFullscreenLabel(){
  const on=!!document.fullscreenElement;
  el("btnFullscreen").textContent=tr(on?"fullscreenOff":"fullscreen");
  el("btnFullscreen").classList.toggle("on",on);
}
el("btnFullscreen").onclick=()=>{
  if(document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(()=>{});
};
addEventListener("fullscreenchange",refreshFullscreenLabel);

el("modeTouch").onclick=()=>{applyMode("touch");reorientMenu();};
el("modeLaptop").onclick=()=>{applyMode("laptop");reorientMenu();};
el("modePuck").onclick=()=>{applyMode("puck");reorientMenu();};
/* De toevoegknop staat op de plek van de verdwenen balk, aan beide zijden van
   de tafel. Vandaar een klasse en geen id. */
[...document.querySelectorAll(".btn-add-puck")].forEach(b=>b.onclick=openLearn);
el("btnSim").onclick=e=>{simMode=!simMode;e.target.classList.toggle("on",simMode);};
el("btnDebug").onclick=e=>{debugMode=!debugMode;e.target.classList.toggle("on",debugMode);};
[...document.querySelectorAll(".btn-clear")].forEach(b=>b.onclick=()=>clearPucks(true));

/* ── Kennisgraaf ───────────────────────────────────────────────── */
function openKgInfo(node,x,y){
  kg.selected=node;
  const n=el("kgInfo");
  resetPanelOffset(n);
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
  if(kg.gaps && !kg.loaded) await ensureKG(kgUrl());
}
/* Lijnen zonder punten zeggen niets, dus deze schakelaar zet de graaflaag zo
   nodig mee aan. Andersom ook: gaat de graaf uit, dan gaan de lijnen mee. */
async function toggleRelations(){
  kg.relations=!kg.relations;
  markLayerMenu();
  if(!kg.relations) return;
  if(!kg.enabled){ kg.enabled=true; el("btnKg").classList.add("on"); }
  if(!kg.nodes.length) await loadKG(kgUrl());
  else el("kgStatus").textContent=kgStatusText();
}
onKgChange(()=>{
  el("kgStatus").textContent=kgStatusText();
  el("btnKg").classList.toggle("on",kg.enabled);
  el("btnKgThemes").classList.toggle("on",kg.useThemes);
});
el("btnKg").onclick=async()=>{
  kg.enabled=!kg.enabled;
  el("btnKg").classList.toggle("on",kg.enabled);
  if(!kg.enabled){ closeKgInfo(); kg.relations=false; markLayerMenu(); kg.statusKey="off"; el("kgStatus").textContent=kgStatusText(); return; }
  if(!kg.nodes.length) await loadKG(kgUrl());
  else el("kgStatus").textContent=kgStatusText();
};
el("btnKgThemes").onclick=async()=>{
  kg.useThemes=!kg.useThemes;
  el("btnKgThemes").classList.toggle("on",kg.useThemes);
  if(kg.useThemes && !kg.themes.length) await loadKG(kgUrl());
};
/* De ontwikkelstand zet zichzelf op de <body>; de stylesheet haalt daarmee
   alles weg wat alleen voor de bouwer is. De twee ijkvelden beginnen bij wat
   in CFG staat en schrijven er live overheen: wat je hier goed zet, zet je
   daarna in CFG zodat de tafel er morgen ook zo bij staat. */
document.body.classList.toggle("dev",DEV);
el("tol").value=String(CFG.tolerance);
el("tolVal").textContent=CFG.tolerance.toFixed(3);
el("diag").value=String(CFG.screenDiagIn);
el("btnSim").classList.toggle("on",simMode);
el("tol").oninput=e=>{CFG.tolerance=tolerance=parseFloat(e.target.value);el("tolVal").textContent=tolerance.toFixed(3);};
el("diag").oninput=e=>{const v=parseFloat(e.target.value); if(Number.isFinite(v)&&v>0) CFG.screenDiagIn=v; resize();};
/* ── Twee zijden ────────────────────────────────────────────────────────
   Een tafel ligt plat en mensen staan er omheen; wat voor de één rechtop
   staat, staat voor de ander op zijn kop. De kaart laten we met rust — dat
   is het gedeelde object, net als een papieren plattegrond die je ook niet
   voor iedereen apart draait. Maar wat persoonlijk en tijdelijk is draait
   wél mee: het venster verschijnt in de leesrichting van de rand waar de
   aanraking vandaan kwam. */
let twoSided=false;
try{ twoSided=localStorage.getItem("pucktable-two-sided")==="1"; }catch(e){}
/* De keuze blijft bewaard, maar telt alleen aan een tafel: op een laptop
   staat er één iemand achter het scherm en is er maar één kijkrichting. De
   puckstand is ook een tafel, al is de balk daar weg. */
const sidesActive=()=>twoSided && tableUi();
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

  const rel=document.createElement("button");
  rel.type="button"; rel.className="layer"; rel.id="btnRelations";
  rel.textContent=tr("relations");
  rel.onclick=toggleRelations;
  box.appendChild(rel);

  const relNote=document.createElement("p");
  relNote.className="hint"; relNote.style.margin="6px 0 0";
  relNote.textContent=tr("relationsNote");
  box.appendChild(relNote);

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
  const r=el("btnRelations");
  if(r){ r.classList.toggle("on",kg.relations); r.setAttribute("aria-pressed",String(kg.relations)); }
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
  resetPanelOffset(m);
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
  hideKeyboardIn(el("menu"));
}
/* Een gekozen kaartbeeld sluit het hele menu: de keuze is gemaakt en de tafel
   hoort weer leeg te zijn. */
function closeLayers(){ closeMenu(); }
/* Wisselt de leesrichting terwijl het menu openstaat, dan gaat het niet dicht
   maar draait het mee. */
const reorientMenu=()=>{
  if(!menuSide) return;
  openMenu(menuSide==="b"&&!sidesActive()?"a":menuSide,menuView);
};
/* Dezelfde knop nog eens indrukken sluit het menu; de andere knop van hetzelfde
   paar wisselt van inhoud zonder dat het venster tussendoor dichtgaat. */
MENU_BTNS.forEach(([id,side,view])=>{
  el(id).onclick=()=>(menuSide===side&&menuView===view)?closeMenu():openMenu(side,view);
});
el("menuClose").onclick=closeMenu;
// Het menu blijft open wanneer iemand daarnaast op de kaart werkt. Sluiten
// gebeurt bewust via het kruisje, dezelfde menuknop of Escape.
buildLayerMenu();
el("sess").onchange=restore;
el("zIn").onclick=()=>MV.zoomBy(1);
el("zOut").onclick=()=>MV.zoomBy(-1);
[...document.querySelectorAll("[data-go]")].forEach(b=>b.onclick=()=>{
  const [la,lo,z]=b.dataset.go.split(",").map(Number);
  MV.lat=la; MV.lng=lo; MV.zoom=z;
});
/* Dit is de enige tekstinvoer aan de kaartkant, en hij faalde volledig in
   stilte: offline, bij een tikfout of bij de snelheidslimiet van Nominatim
   gebeurde er letterlijk niets. Wie "Ginneken" typt, Enter drukt en niets ziet
   gebeuren, concludeert dat de tafel stuk is. Nu staat er onder het veld wat
   er aan de hand is, en er zit een wachttijd op. */
el("search").onkeydown=async e=>{
  if(e.key!=="Enter") return;
  const q=e.target.value.trim(), hint=el("searchHint");
  if(!q){ hint.textContent=""; return; }
  hint.textContent=tr("searchBusy");
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(q),
                        {signal:AbortSignal.timeout(8000)});
    if(!r.ok) throw new Error("HTTP "+r.status);
    const j=await r.json();
    if(j[0]){ MV.lat=+j[0].lat; MV.lng=+j[0].lon; MV.zoom=15; hint.textContent=j[0].display_name||""; }
    else hint.textContent=tr("searchNone");
  }catch(err){ hint.textContent=tr("searchFailed"); }
};
/* Elke aanslag gaat meteen naar de markering. Dit is een tafel waar meerdere
   mensen tegelijk bezig zijn: er is één notitievenster, en wachten tot iemand
   op "Bewaren" drukt betekende dat de half getypte bijdrage van de eerste weg
   was zodra de tweede een markering aantikte. "Bewaren" opent nu alleen nog
   de optionele contactstap; de bijdrage zelf stond daarvoor al veilig. */
function noteToPin(v){
  const pin=v?.pin; if(!pin) return;
  pin.title=notePart(v,"noteTitle").value.trim();
  pin.description=notePart(v,"noteText").value.trim();
  pin.note=pin.description;  // keep older exports and saved sessions compatible
}
/* De knoppen in de vensters worden per venster aangesloten; zie `wireNote`. */
function refreshNoteFlipLabels(){
  for(const v of noteViews){
    const fb=notePart(v,"noteFlip");
    if(fb){ fb.title=tr("flipSide"); fb.setAttribute("aria-label",tr("flipSide")); }
  }
}
/* `confirm()` verschijnt in de oriëntatie van de browser — dus op zijn kop
   voor de helft van het gezelschap — staat buiten de bedieningsschaal en legt
   de tekenlus stil zolang hij openstaat. Twee tikken op dezelfde knop doen
   hetzelfde werk, in de leesrichting van wie hem indrukt. */
let wipeArmedAt=0;
function resetWipeButton(){
  wipeArmedAt=0;
  el("btnWipe").classList.remove("on");
  el("btnWipe").textContent=tr("wipe");
}
el("btnWipe").onclick=()=>{
  const now=performance.now();
  if(wipeArmedAt&&now-wipeArmedAt<4000){ pins.length=0; save(); resetWipeButton(); return; }
  wipeArmedAt=now;
  el("btnWipe").classList.add("on");
  el("btnWipe").textContent=tr("wipeAgain");
  setTimeout(()=>{ if(wipeArmedAt&&performance.now()-wipeArmedAt>=4000) resetWipeButton(); },4100);
};
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
    properties:{verdict:p.verdict,topic:p.topic,title:p.title||"",description:p.description||p.note||"",
                transcript:p.transcript||"",time:p.t,contact_name:p.contact?.name||"",
                contact_email:p.contact?.email||"",contact_phone:p.contact?.phone||"",
                contact_consent_at:p.contact?.consentAt||""}}))
},null,2),"application/geo+json");
const csvCell=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
el("btnCsv").onclick=()=>download(el("sess").value+".csv",
  "lat,lng,verdict,topic,title,description,gesprek,time,contact_name,contact_email,contact_phone,contact_consent_at\n"+pins.map(p=>
    [p.lat,p.lng,p.verdict,p.topic,csvCell(p.title),csvCell(p.description||p.note),
     csvCell(p.transcript),p.t,csvCell(p.contact?.name),csvCell(p.contact?.email),
     csvCell(p.contact?.phone),csvCell(p.contact?.consentAt)].join(",")).join("\n"),"text/csv");

/* ── Puck herkennen ──────────────────────────────────────────────────────
   Vijf pootjes op een ring zijn een puck — of, bij de oude pucks, drie stukjes
   koperfolie in een driehoek. Welke puck het is, staat er nergens op te lezen.
   Het aantal punten op het glas zegt zelf welke van de twee er ligt: drie is
   een driehoek, vijf is een ring. Bij een ring moet de pijl naar boven wijzen,
   want anders weet de tafel wel de vorm maar niet de voorkant. Dit venster meet de driehoek die op tafel
   ligt en laat je hem daarna een naam geven — Goed, Probleem, Discussie, Idee.
   De meting overschrijft de driehoek van die ene puck en blijft in localStorage
   staan, dus dit scherm kent hem ook na herladen. Er komt nooit een vijfde puck
   bij: het aantal pucks is een ontwerpkeuze, geen meetresultaat.

   Er wordt niet één beeldje gepakt maar een reeks: een vinger of een plakker
   trilt een paar pixels, en de mediaan van ~50 metingen ligt veel vaster dan
   een momentopname. Verschuift de puck tijdens het meten, dan begint de reeks
   opnieuw — anders meet je de beweging mee. */
/* Eén regel die een sjabloon beschrijft, voor alle lijstjes in dit venster: de
   gaten tussen de pootjes zijn wat een ringpuck is, de zijdeverhoudingen wat
   een driehoek is. */
const gapText=angles=>gapsOf(angles).map(g=>Math.round(g)).join("·");
const tplSummary=t=>isRing(t)
  ? `${gapText(t.angles)}° · straal ${tplRing(t).toFixed(1)} mm`
  : `${t.ratios[0].toFixed(3)} / ${t.ratios[1].toFixed(3)} · ${tplLongest(t).toFixed(1)} mm`;
const LEARN_HOLD_MS=900, LEARN_STILL_PX=9, LEARN_MIN_SAMPLES=12;
const learn={open:false,phase:"wait",samples:[],t0:0,m:null,tplId:null,clash:null,note:"",moved:false};

/* Alleen wat de tafel écht gemeten heeft telt als "bekend". Een fabrieks-
   driehoek die toevallig lijkt op de puck die je nu neerlegt mag je meting niet
   opeten -- die puck is immers nog nooit ingelezen. */
const learnedTemplates=()=>activeTemplates().filter(t=>t.learnedAt);
/* De contactpunten die nog van niemand zijn. Een puck die al ingelezen is en
   gewoon op tafel blijft liggen wordt herkend, en zijn drie punten vallen hier
   af: je kunt de volgende puck er dus naast leggen zonder de vorige weg te
   halen. `learnKnown` houdt bij hoeveel pucks er zo herkend liggen, alleen om
   het te kunnen zeggen. */
let learnKnown=0;
function learnPoints(){
  const pts=[...realTouches.values()];
  const known=learnedTemplates();
  if(!known.length){ learnKnown=0; return pts; }
  const {pucks,usedIdx}=recognise(pts,known);
  learnKnown=pucks.length;
  return pts.filter((p,i)=>!usedIdx.has(i));
}
function openLearn(){
  closeMenu();
  learn.open=true; el("learn").style.display="block";
  restartLearn();
}
function closeLearn(){ learn.open=false; el("learn").style.display="none"; }
/* `clearFirst` hoort bij de knop "Volgende puck". De vorige puck ligt op dat
   moment nog op het glas, en de meting begon meteen opnieuw op diezelfde drie
   contactpunten: je kreeg dus de vorige puck nog een keer, zonder tijd om de
   volgende neer te leggen. Daarom wacht hij nu tot het glas leeg is. */
function restartLearn(clearFirst=false){
  learn.phase=(clearFirst&&learnPoints().length)?"clear":"wait";
  learn.samples=[]; learn.m=null;
  learn.tplId=null; learn.clash=null; learn.moved=false;
  setLearnBar(0); renderLearn();
}
/* "Er ligt er al een die ik ken" -- zonder dat lijkt het alsof de tafel de
   eerste puck vergeten is zodra hij niet meer meetelt. */
function learnKnownNote(){
  if(learnKnown) return tr("recogKnownOnTable",learnKnown);
  /* Ligt er wel een ingelezen puck maar wordt hij niet herkend, dan tellen zijn
     punten gewoon mee en sta je naar "zes contactpunten" te kijken zonder te
     weten waarom. Dan zegt de kaart het maar zelf. */
  const n=learnedTemplates().length;
  return n?tr("recogNoneKnownSeen",n):"";
}
function setLearnBar(f){ el("learnBar").style.width=(Math.max(0,Math.min(1,f))*100).toFixed(1)+"%"; }

/* Elk beeldje: de punten natekenen, en zolang er nog niets gemeten is de reeks
   bijhouden. Alleen de echte aanrakingen tellen mee — een gesleepte puck uit de
   balk is een tekening en heeft niets te leren. */
function updateLearn(now){
  const pts=learnPoints();
  drawLearnPoints(pts);
  const st=el("learnStatus");
  if(learn.phase==="done"||learn.phase==="saved") return;
  if(learn.phase==="clear"){
    // Wachten tot het glas leeg is; dan pas telt wat er daarna op komt.
    st.innerHTML=tr("recogLift",pts.length);
    learn.samples=[]; setLearnBar(0);
    if(!pts.length){ learn.phase="wait"; renderLearn(); }
    return;
  }
  if(pts.length!==3&&pts.length!==5){
    if(learn.phase!=="wait"){ learn.phase="wait"; renderLearn(); }
    learn.samples=[]; learn.moved=false; setLearnBar(0);
    st.innerHTML=tr("recogWait",pts.length)+learnKnownNote();
    return;
  }
  /* Vijf punten is een gedrukte puck, drie een driehoek van tape. Wat er ligt
     bepaalt dus zelf welke vorm er wordt opgeslagen. */
  const ring=pts.length===5;
  const d=ring?describeRing(pts):describe(pts[0],pts[1],pts[2]);
  if(!d) return;
  // Vijf punten die niet op één cirkel liggen zijn vingers, geen puck.
  if(ring&&d.spread>0.20){
    learn.samples=[]; setLearnBar(0);
    st.innerHTML=tr("recogWait",pts.length)+learnKnownNote();
    return;
  }
  const size=ring?d.radius:d.longest;
  const last=learn.samples[learn.samples.length-1];
  if(last && (last.ring!==ring ||
              Math.hypot(d.cx-last.cx,d.cy-last.cy)>LEARN_STILL_PX ||
              Math.abs(size-last.size)>LEARN_STILL_PX)){
    learn.samples=[]; learn.moved=true;
  }
  if(!learn.samples.length) learn.t0=now;
  /* De hoeken gaan meteen om naar hoeken vanaf de pijl. Op het scherm wijst de
     pijl naar boven en dat is −90°, dus er komt 90 bij. */
  learn.samples.push(ring
    ? {ring:true,angles:d.angles.map(a=>norm360(a+90)),size,cx:d.cx,cy:d.cy}
    : {ring:false,r0:d.ratios[0],r1:d.ratios[1],size,cx:d.cx,cy:d.cy});
  if(learn.phase!=="hold"){ learn.phase="hold"; learn.note=""; renderLearn(); }
  const held=now-learn.t0;
  setLearnBar(held/LEARN_HOLD_MS);
  st.innerHTML=learn.moved&&held<250?tr("recogMoved"):tr("recogHold",pts.length);
  if(held>=LEARN_HOLD_MS && learn.samples.length>=LEARN_MIN_SAMPLES){
    learn.m=learnMedian();
    learn.phase="done"; learn.moved=false; setLearnBar(1); renderLearn();
  }
}
/* De mediaan over de reeks. Bij een driehoek gaat dat getal voor getal. Bij een
   ring moet eerst vaststaan welk pootje welk is: het eerste beeldje is de maat
   en elk volgend beeldje wordt zo gedraaid dat het daar het beste op past.
   Zonder dat verspringt de volgorde zodra een pootje net langs de pijl trilt,
   en meet je een puck die er niet is. Het optellen gebeurt in verschillen ten
   opzichte van dat eerste beeldje, zodat 359° en 1° buren blijven. */
function learnMedian(){
  const S=learn.samples;
  const med=f=>{ const a=S.map(f).sort((x,y)=>x-y); return a[a.length>>1]; };
  const size=med(s=>s.size);
  if(!S[0].ring) return {ring:false,r0:med(s=>s.r0),r1:med(s=>s.r1),longest:size};
  const base=S[0].angles, wrap=a=>((a+180)%360+360)%360-180;
  const cols=[[],[],[],[],[]];
  for(const sm of S){
    let bs=0,bErr=Infinity;
    for(let k=0;k<5;k++){
      let e=0; for(let i=0;i<5;i++) e+=Math.abs(wrap(sm.angles[(i+k)%5]-base[i]));
      if(e<bErr){ bErr=e; bs=k; }
    }
    for(let i=0;i<5;i++) cols[i].push(base[i]+wrap(sm.angles[(i+bs)%5]-base[i]));
  }
  const angles=cols.map(c=>{ c.sort((x,y)=>x-y); return norm360(c[c.length>>1]); });
  return {ring:true,angles:angles.sort((a,b)=>a-b),radius:size};
}
/* De meting staat over de kaart heen getekend: zo zie je meteen of de
   tafel alle drie de plakkers ziet en op de goede plek. */
function drawLearnPoints(pts){
  const svg=el("learnPoints");
  let shape="";
  if(pts.length===3)
    shape=`<polygon points="${pts.map(p=>p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ")}"/>`;
  else if(pts.length===5){
    // Bij vijf punten de gepaste cirkel: zo zie je in één oogopslag of ze
    // allemaal op de rand van de puck liggen.
    const f=fitCircle(pts);
    if(f) shape=`<circle cx="${f.cx.toFixed(1)}" cy="${f.cy.toFixed(1)}" r="${f.r.toFixed(1)}" class="learn-fit"/>`;
  }
  const html=shape+pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="15"/>`).join("");
  if(svg.dataset.h===html) return;
  svg.dataset.h=html; svg.innerHTML=html;
}
/* Een bijna gelijkbenige driehoek heeft geen duidelijke voorkant: welke hoek de
   "anchor" is wisselt dan van beeldje tot beeldje, en daarmee de hoek waarop het
   hele ringmenu draait. Beter nu zeggen dan straks aan tafel ontdekken. */
const nearlyIsosceles=(r0,r1)=>Math.abs(r0-r1)<0.06||(1-r1)<0.06;
function learnStamp(t){
  if(!t.learnedAt) return tr("recogFactory");
  const d=new Date(t.learnedAt);
  return tr("recogLearned",isNaN(d)?"":d.toLocaleDateString(L[lang].locale,{day:"numeric",month:"short"}));
}
/* In de puckstand is er geen balk meer die laat zien welke pucks de tafel kent.
   Dat overzicht staat daarom hier, met een kruisje per puck: inlezen en
   weggooien horen bij elkaar en gebeuren aan dezelfde tafel. */
function ownPuckList(){
  if(!ownPucks.length) return `<p class="hint">${tr("recogNoneYet")}</p>`;
  return `<p class="learn-which">${tr("recogKnown",ownPucks.length)}</p>`+ownPucks.map(t=>
    `<div class="own-row" style="--c:${vColor(t.verdict)}">
       <b>${vName(t.verdict)}</b>
       <span>${t.id} &middot; ${tplSummary(t)} &middot; ${learnStamp(t)}</span>
       <button class="own-del danger" data-id="${t.id}" aria-label="${tr("recogRemove")}" title="${tr("recogRemove")}">&times;</button>
     </div>`).join("");
}
function renderLearn(){
  const body=el("learnBody"), st=el("learnStatus");
  /* Twee zinnen die per stand verschillen: in de puckstand kies je geen puck uit
     een lijstje maar maak je er een bij, en wissen gooit je eigen pucks weg in
     plaats van terug te zetten naar de bouwtekening. */
  el("learnIntro").textContent=tr(puckMode()?"recogIntroOwn":"recogIntro");
  el("btnLearnReset").textContent=tr(puckMode()?"recogResetOwn":"recogReset");
  if(learn.phase==="saved"){
    const tpl=activeTemplates().find(t=>t.id===learn.tplId);
    if(!tpl){ restartLearn(); return; }
    st.innerHTML=(isRing(tpl)
        ? tr("recogSavedRing",vName(tpl.verdict),gapText(tpl.angles),tplRing(tpl).toFixed(1))
        : tr("recogSaved",vName(tpl.verdict),tpl.ratios[0].toFixed(3),
                          tpl.ratios[1].toFixed(3),tplLongest(tpl).toFixed(1)))
                +(learn.clash?tr("recogClash",learn.clash):"");
    body.innerHTML=`<div class="row"><button class="primary" id="btnLearnAgain">${tr("recogAgain")}</button></div>`;
    el("btnLearnAgain").onclick=()=>restartLearn(true);
    return;
  }
  if(learn.phase==="done"){
    st.innerHTML=learn.m.ring
      ? tr("recogMeasuredRing",gapText(learn.m.angles),(learn.m.radius/pxPerMM).toFixed(1))
      : tr("recogMeasured",learn.m.r0.toFixed(3),learn.m.r1.toFixed(3),
                           (learn.m.longest/pxPerMM).toFixed(1));
    /* Dezelfde waarschuwing, twee vormen: een driehoek zonder duidelijke
       voorkant is bijna gelijkbenig, een ring lijkt op zichzelf na een slag
       draaien. In allebei de gevallen loopt het ringmenu straks vast. */
    const wobbly=learn.m.ring
      ? (ringSelfSym(gapsOf(learn.m.angles))<CFG.ringToleranceDeg*1.2?tr("recogRingSym"):"")
      : (nearlyIsosceles(learn.m.r0,learn.m.r1)?tr("recogIso"):"");
    const iso=wobbly?`<p class="learn-warn">${wobbly}</p>`:"";
    if(puckMode()){
      /* Geen preset. De meting wordt een nieuwe puck; je zegt alleen nog wat
         voor soort het is, en dezelfde soort mag vaker voorkomen. */
      body.innerHTML=iso+`<p class="learn-which">${tr("recogWhichKind")}</p>`+VERDICTS.map(v=>
        `<button class="learn-pick" data-verdict="${v.key}" style="--c:${v.color}">
           <b>${vName(v.key)}</b>
           <span>${tr("recogKindCount",ownPucks.filter(t=>t.verdict===v.key).length)}</span>
         </button>`).join("");
      [...body.querySelectorAll(".learn-pick")].forEach(b=>b.onclick=()=>addLearnedPuck(b.dataset.verdict));
      return;
    }
    body.innerHTML=iso+`<p class="learn-which">${tr("recogWhich")}</p>`+templates.map(t=>
      `<button class="learn-pick" data-id="${t.id}" style="--c:${vColor(t.verdict)}">
         <b>${vName(t.verdict)}</b>
         <span>${t.id} · ${tplSummary(t)} · ${learnStamp(t)}</span>
       </button>`).join("");
    [...body.querySelectorAll(".learn-pick")].forEach(b=>b.onclick=()=>assignLearn(b.dataset.id));
    return;
  }
  if(learn.phase==="clear"){
    st.innerHTML=tr("recogLift",learnPoints().length);
    // Wie tóch dezelfde puck nog eens wil meten, hoeft hem niet op te tillen.
    body.innerHTML=`<div class="row"><button id="btnLearnAnyway">${tr("recogAnyway")}</button></div>`;
    el("btnLearnAnyway").onclick=()=>{ learn.phase="wait"; renderLearn(); };
    return;
  }
  body.innerHTML=(learn.note?`<p class="hint">${learn.note}</p>`:"")+(puckMode()?ownPuckList():"");
  [...body.querySelectorAll(".own-del")].forEach(b=>b.onclick=()=>{
    removeOwnPuck(b.dataset.id); learn.note=tr("recogRemoved"); renderLearn(); });
  if(learn.phase==="wait") st.innerHTML=tr("recogWait",learnPoints().length)+learnKnownNote();
}
/* Hier gebeurt het onthouden. De driehoek van die ene puck wordt vervangen —
   ook zijn maat, want geknipte tape is nooit precies 60 mm — en meteen
   weggeschreven. Lijkt de nieuwe driehoek te veel op die van een andere puck,
   dan wordt dat er hard bij gezegd: dan verwisselt de tafel ze straks. */
/* De meting als sjabloonvorm: vijf hoeken vanaf de pijl plus de straal, of de
   twee zijdeverhoudingen plus de langste zijde. */
const learnShape=()=>learn.m.ring
  ? {angles:learn.m.angles.map(a=>+a.toFixed(1)),ringMM:+(learn.m.radius/pxPerMM).toFixed(1)}
  : {ratios:[+learn.m.r0.toFixed(3),+learn.m.r1.toFixed(3)],
     longestMM:+(learn.m.longest/pxPerMM).toFixed(1)};
/* Lijkt deze meting te veel op een puck die er al is? Bij ringen gaat dat over
   de gaten tussen de pootjes, bij driehoeken over de zijdeverhoudingen — en een
   ring lijkt nooit op een driehoek. */
function shapeClash(t,shape){
  if(isRing(t)!==!!shape.angles) return false;
  if(shape.angles){
    const a=[...shape.angles].sort((x,y)=>x-y);
    return matchRing({angles:a,gaps:gapsOf(a)},t).err<CFG.ringToleranceDeg*1.5;
  }
  return Math.hypot(t.ratios[0]-shape.ratios[0],t.ratios[1]-shape.ratios[1])<0.12;
}
function assignLearn(id){
  const tpl=templates.find(t=>t.id===id);
  if(!tpl||!learn.m) return;
  const shape=learnShape();
  const clash=templates.find(t=>t!==tpl&&shapeClash(t,shape));
  applyShape(tpl,shape);
  tpl.learnedAt=new Date().toISOString();
  saveTemplates();
  learn.tplId=id; learn.clash=clash?vName(clash.verdict):null; learn.phase="saved";
  renderLearn(); renderTray();
  if(el("sheet").style.display==="block") buildSheet();
}
/* De puckstand kent geen vaste vier: elke meting komt er als nieuwe puck bij.
   Lijkt de driehoek te veel op een puck die je al hebt, dan wordt dat gezegd --
   die twee verwisselt de tafel straks. */
function addLearnedPuck(verdict){
  if(!learn.m||!VERDICTS.some(v=>v.key===verdict)) return;
  const shape=learnShape();
  const clash=ownPucks.find(t=>shapeClash(t,shape));
  const p=addOwnPuck(verdict,shape);
  if(!p) return;
  learn.tplId=p.id; learn.clash=clash?vName(clash.verdict):null; learn.phase="saved";
  renderLearn();
  if(el("sheet").style.display==="block") buildSheet();
}
el("btnRecognise").onclick=openLearn;
el("closeLearn").onclick=closeLearn;
el("closeLearnTop").onclick=closeLearn;
el("btnLearnReset").onclick=()=>{
  if(puckMode()){ ownPucks.length=0; saveOwnPucks(); tracks.clear(); learn.note=tr("recogClearedOwn"); }
  else{ resetTemplates(); renderTray(); learn.note=tr("recogCleared"); }
  restartLearn();
};
el("btnLearnExport").onclick=()=>download("puck-metingen.json",JSON.stringify({
  screenDiagIn:CFG.screenDiagIn, pxPerMM:+pxPerMM.toFixed(3), tolerance,
  templates:activeTemplates().map(tplWire)
},null,2),"application/json");
el("btnExport").onclick=()=>download("puck-config.json",
  JSON.stringify({longestSideMM:CFG.longestSideMM,tolerance,templates:activeTemplates()},null,2),"application/json");
function buildSheet(){
  el("sheetGrid").innerHTML=activeTemplates().map(t=>{
    const span=tplSpanMM(t), pads=padsFor(t), S=150, sc=(S*0.34)/span*2;
    const pts=pads.map(p=>({x:S/2+p.x*sc,y:S/2+p.y*sc})),c=vColor(t.verdict);
    return `<div class="sheetcard"><h3 style="color:${c}">${t.id} · ${vName(t.verdict)}</h3>
      <svg width="100%" viewBox="0 0 ${S} ${S}">
        <circle cx="${S/2}" cy="${S/2}" r="${CFG.puckRadiusMM*sc}" fill="none" stroke="#2c3846"/>
        ${isRing(t)
          ? `<circle cx="${S/2}" cy="${S/2}" r="${(tplRing(t)*sc).toFixed(1)}" fill="none" stroke="${c}" stroke-dasharray="3 3"/>`
          : `<polygon points="${pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="none" stroke="${c}" stroke-dasharray="3 3"/>`}
        ${pts.map((p,i)=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${c}"/>
        <text x="${(p.x+9).toFixed(1)}" y="${(p.y+4).toFixed(1)}" font-size="10" font-family="monospace" fill="#7f8b9b">${"ABC"[i]}</text>`).join("")}
      </svg>
      <table>${pads.map((p,i)=>`<tr><td>${tr("sheetPad")} ${"ABCDE"[i]}</td><td>x ${p.x.toFixed(1)} mm</td><td>y ${p.y.toFixed(1)} mm</td></tr>`).join("")}
      ${isRing(t)
        ? `<tr><td>${tr("sheetGaps")}</td><td colspan="2">${gapText(t.angles)}°</td></tr>
           <tr><td>${tr("sheetRing")}</td><td colspan="2">${tplRing(t).toFixed(1)} mm</td></tr>`
        : `<tr><td>${tr("sheetRatios")}</td><td colspan="2">${t.ratios[0]} / ${t.ratios[1]}</td></tr>
           <tr><td>${tr("sheetLongest")}</td><td colspan="2">${tplLongest(t).toFixed(1)} mm</td></tr>`}</table></div>`;
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
  if(learn.open){ closeLearn(); return; }
  if(el("sheet").style.display==="block"){ closeSheet(); return; }
  if(menuSide){ closeMenu(); return; }
  // Escape sluit het bovenste venster: met twee open hoort er één tegelijk weg.
  if(openNotes().length){ closeNote(openNotes().pop()); return; }
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
   so the table shows a map even with no connection at all.

   Die afbeelding is een JPEG van een paar megabyte en stond in localStorage —
   dezelfde 5 MB waar de bijdragen in moeten. Wie 's ochtends op "Kaart offline
   bewaren" drukte, zag daarna elke bijdrage stilletjes niet bewaard worden.
   Hij gaat nu naar IndexedDB, dat een eigen en veel ruimere quota heeft. */
const BAKE_DB="pucktable", BAKE_STORE="basemap", BAKE_KEY="current";
function bakeIDB(mode,run){
  return new Promise((resolve,reject)=>{
    if(!self.indexedDB) return reject(new Error("geen IndexedDB"));
    const req=indexedDB.open(BAKE_DB,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(BAKE_STORE)) req.result.createObjectStore(BAKE_STORE);
    };
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{
      const db=req.result;
      let op;
      try{ op=run(db.transaction(BAKE_STORE,mode).objectStore(BAKE_STORE)); }
      catch(err){ db.close(); return reject(err); }
      op.onsuccess=()=>{ resolve(op.result); db.close(); };
      op.onerror =()=>{ reject(op.error);   db.close(); };
    };
  });
}
const bakePut=rec=>bakeIDB("readwrite",st=>st.put(rec,BAKE_KEY));
const bakeGet=()=>bakeIDB("readonly", st=>st.get(BAKE_KEY));
const bakeDel=()=>bakeIDB("readwrite",st=>st.delete(BAKE_KEY));
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
  bakePut(rec)
    .then(()=>{ el("bakeHint").innerHTML=tr("bakeSaved",Math.round(data.length/1024)); })
    .catch(()=>{ el("bakeHint").innerHTML=tr("bakeTooBig"); });
}
function showBasemap(rec){
  if(!rec||!rec.data) return;
  const img=new Image();
  img.onload=()=>{ bgImage={img,west:rec.west,north:rec.north,east:rec.east,south:rec.south}; };
  img.src=rec.data;
}
function restoreBasemap(){
  // Een kaart die vóór de verhuizing naar IndexedDB bewaard is, verhuist mee
  // en gaat daarna uit localStorage: daar hield hij de ruimte bezet die de
  // bijdragen nodig hebben.
  let old=null;
  try{ old=localStorage.getItem("pucktable-basemap"); }catch(e){}
  if(old){
    try{
      const rec=JSON.parse(old);
      showBasemap(rec);
      bakePut(rec).then(()=>{ try{ localStorage.removeItem("pucktable-basemap"); }catch(e){} })
                  .catch(()=>{});
      return;
    }catch(e){}
  }
  bakeGet().then(showBasemap).catch(()=>{});
}
el("btnBake").onclick=()=>{ bakePending=true; };
el("btnUnbake").onclick=()=>{
  bgImage=null;
  try{ localStorage.removeItem("pucktable-basemap"); }catch(e){}
  bakeDel().catch(()=>{});
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
  resetWipeButton();
  applyResetKey();
  applyCalm();
  applyLock();
  applyPinMoveMode();
  renderTray();
  renderKeyboard();
  updateUI([]);
  refreshModeTexts();
  refreshNoteFlipLabels();
  refreshOrientationControl();
  refreshFullscreenLabel();
  // Open vensters horen niet eerst dicht te moeten voordat ze meegaan.
  for(const v of openNotes()){
    notePart(v,"noteHead").textContent=vName(v.pin.verdict)+" \u00b7 "+v.pin.topic;
    // De tafel wisselt van taal: een gesprek dat nog niet loopt gaat mee.
    if(!talkRunning(v.pin)) v.talkLang=null;
    renderTalk(v);
    setTalkMsg(v,v.talkMsg.key,{warn:v.talkMsg.warn,args:v.talkMsg.args});
  }
  if(el("kgInfo").style.display==="block" && kg.selected){
    openKgInfo(kg.selected,+el("kgInfo").dataset.anchorX,+el("kgInfo").dataset.anchorY);
  }
  if(el("sheet").style.display==="block") buildSheet();
  if(learn.open) renderLearn();
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

restoreTemplates(); restoreOwnPucks();
applyColorTheme(colorTheme); resize(); restore(); restoreBasemap(); applyScale(); applyLock(); applyPinMoveMode(); applyMode(uiMode); renderTray(); applyLang(); frame();

/* ---- Bijgewerkt-stempel -------------------------------------------------
   Klein regeltje onder elke puckbalk: wanneer de bestanden van deze pagina
   voor het laatst zijn gewijzigd, en hoe laat deze pagina is geladen.
   Zo is te zien of een verversing de nieuwe versie heeft opgepikt. De tijd
   van wijzigen komt uit de Last-Modified-header van de bestanden; levert de
   server die niet, dan valt hij terug op document.lastModified. */
const STAMP_FILES=["./index.html","./app.js","./styles.css","./kg.js"];
function stampDate(d){
  return d.toLocaleString(tr("locale"),{day:"2-digit",month:"2-digit",year:"numeric",
                                   hour:"2-digit",minute:"2-digit"});
}
async function showBuildStamp(){
  // Eén stempel per puckbalk (de tafel heeft er twee), plus een eventueel
  // los #buildStamp-element. Vandaar een selector in plaats van één id.
  const nodes=[...document.querySelectorAll(".build-stamp, #buildStamp")];
  if(!nodes.length) return;
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
  const txt=(newest?tr("stampUpdated",stampDate(newest)):tr("stampUnknown"))+tr("stampLoaded",geladen);
  for(const node of nodes) node.textContent=txt;
}
refreshBuildStamp=showBuildStamp;
showBuildStamp();
