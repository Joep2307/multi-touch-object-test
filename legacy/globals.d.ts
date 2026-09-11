/* Wat de tafel aan de browser zelf toevoegt.

   Dit bestand voegt niets toe aan wat er draait; het vertelt TypeScript alleen
   dat deze dingen bestaan. Drie soorten:

   1. Wat de tafel aan `window` hangt om vanaf de console of vanuit de rooktest
      bij het binnenwerk te kunnen.
   2. Spraakherkenning, die in Chrome nog onder een eigen naam zit en in de
      standaardtypes van de browser ontbreekt.
   3. Beeldschermbrede APIs die nieuwer zijn dan de types die bij TypeScript
      zitten. */

interface Window {
  /* Naar welke schermrand het geografische noorden wijst — vanaf de console te
     zetten terwijl de tafel draait, om hem op de zaal uit te lijnen. */
  setNorth: (degrees?: number) => void;
  /* De kaartstand (midden, zoom, tegelset). Bewust `any`: dit is gereedschap
     om mee te rommelen, geen afspraak waar code van afhangt. */
  MV: any;
  /* Alleen aanwezig met `?test` in de URL: het handvat waarmee test/smoke.mjs
     de herkenning aanspreekt zonder een echte puck op het glas te leggen. */
  __puck?: Record<string, any>;
  /* Spraakherkenning van de browser. Chrome kent alleen de webkit-naam, Safari
     ook; Firefox geen van beide. speech.ts kijkt daarom naar allebei. */
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}
