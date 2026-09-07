import type { Lang } from "../types/Lang";
import type { Pin } from "../types/Pin";

/* The default demo doesn't open as an empty map. Three filled-in contributions
   per kind lie around Breda, spread over a few recognisable places.

   Place and kind are the same in every language — those are the coordinates of
   the table's own city. Only what was said differs, so each entry carries both
   wordings and restore() seeds the one the table is set to. The topic is stored
   under its English name; topicLabel() puts the Dutch one on screen when the
   table is switched over. */
const PLACES = [
    {
        id: "demo-good-1",
        lat: 51.58918,
        lng: 4.7762,
        verdict: "good",
        topic: "Green",
        en: {
            title: "More room for trees",
            description:
                "The extra trees on the Grote Markt give shade and make the square more pleasant in summer.",
        },
        nl: {
            title: "Meer ruimte voor bomen",
            description:
                "De extra bomen op de Grote Markt geven schaduw en maken het plein prettiger in de zomer.",
        },
    },
    {
        id: "demo-good-2",
        lat: 51.58696,
        lng: 4.77963,
        verdict: "good",
        topic: "Traffic",
        en: {
            title: "Good cycle route along the canal",
            description:
                "The segregated route feels safe and connects well to the town centre.",
        },
        nl: {
            title: "Fijne fietsroute langs de singel",
            description:
                "De vrijliggende route voelt veilig en sluit goed aan op het centrum.",
        },
    },
    {
        id: "demo-good-3",
        lat: 51.58854,
        lng: 4.77091,
        verdict: "good",
        topic: "Social",
        en: {
            title: "A welcoming place to meet",
            description:
                "The park is used by young and old alike and invites people to stay longer.",
        },
        nl: {
            title: "Prettige ontmoetingsplek",
            description:
                "Het park wordt door jong en oud gebruikt en nodigt uit om langer te blijven.",
        },
    },

    {
        id: "demo-bad-1",
        lat: 51.59002,
        lng: 4.77536,
        verdict: "bad",
        topic: "Waste",
        en: {
            title: "Waste beside the containers",
            description:
                "Especially after the weekend, bags and loose packaging are left lying here.",
        },
        nl: {
            title: "Afval naast de containers",
            description:
                "Vooral na het weekend blijven hier zakken en losse verpakkingen liggen.",
        },
    },
    {
        id: "demo-bad-2",
        lat: 51.58638,
        lng: 4.78102,
        verdict: "bad",
        topic: "Safety",
        en: {
            title: "Dark crossing",
            description:
                "The crossing is hard to see in the evening and cars often drive too fast here.",
        },
        nl: {
            title: "Donkere oversteek",
            description:
                "De oversteek is in de avond slecht zichtbaar en auto's rijden hier vaak te hard.",
        },
    },
    {
        id: "demo-bad-3",
        lat: 51.59206,
        lng: 4.77843,
        verdict: "bad",
        topic: "Traffic",
        en: {
            title: "Busy junction",
            description:
                "Cyclists and turning traffic come together unclearly here during rush hour.",
        },
        nl: {
            title: "Drukke kruising",
            description:
                "Fietsers en afslaand verkeer komen hier onduidelijk samen tijdens de spits.",
        },
    },

    {
        id: "demo-talk-1",
        lat: 51.58897,
        lng: 4.77673,
        verdict: "talk",
        topic: "Traffic",
        en: {
            title: "A town centre with less car traffic",
            description:
                "Discuss how deliveries stay possible once there is less through traffic.",
        },
        nl: {
            title: "Autoluwe binnenstad",
            description:
                "Bespreek hoe bevoorrading mogelijk blijft als er minder doorgaand autoverkeer komt.",
        },
    },
    {
        id: "demo-talk-2",
        lat: 51.5871,
        lng: 4.77905,
        verdict: "talk",
        topic: "Green",
        en: {
            title: "Use of the quayside",
            description:
                "Can lingering, events and more greenery exist side by side here?",
        },
        nl: {
            title: "Gebruik van de kade",
            description:
                "Kunnen verblijf, evenementen en meer groen hier naast elkaar bestaan?",
        },
    },
    {
        id: "demo-talk-3",
        lat: 51.58812,
        lng: 4.77156,
        verdict: "talk",
        topic: "Social",
        en: {
            title: "Room for different ages",
            description:
                "Discuss which facilities appeal to children, teenagers and older people alike.",
        },
        nl: {
            title: "Ruimte voor verschillende leeftijden",
            description:
                "Bespreek welke voorzieningen zowel kinderen, jongeren als ouderen aanspreken.",
        },
    },

    {
        id: "demo-idea-1",
        lat: 51.58955,
        lng: 4.77691,
        verdict: "idea",
        topic: "Green",
        en: {
            title: "Facade garden route",
            description:
                "Create an unbroken route of facade gardens and rain barrels through the town centre.",
        },
        nl: {
            title: "Geveltuinenroute",
            description:
                "Maak een aaneengesloten route van geveltuinen en regentonnen door de binnenstad.",
        },
    },
    {
        id: "demo-idea-2",
        lat: 51.58672,
        lng: 4.78012,
        verdict: "idea",
        topic: "Safety",
        en: {
            title: "Line of light at the crossing",
            description:
                "Mark the walking route with warm, low lighting that stays clearly visible in the evening.",
        },
        nl: {
            title: "Lichtlijn bij de oversteek",
            description:
                "Markeer de looproute met warme, lage verlichting die ook 's avonds goed zichtbaar is.",
        },
    },
    {
        id: "demo-idea-3",
        lat: 51.59172,
        lng: 4.77784,
        verdict: "idea",
        topic: "Waste",
        en: {
            title: "Smart collection point",
            description:
                "Place a compact collection point with separate compartments and an alert when a bin is full.",
        },
        nl: {
            title: "Slim inzamelpunt",
            description:
                "Plaats een compact inzamelpunt met aparte vakken en een melding wanneer een bak vol is.",
        },
    },
] as const;

const seed = (lang: Lang): Pin[] =>
    PLACES.map(({ id, lat, lng, verdict, topic, ...text }, i): Pin => ({
        id,
        lat,
        lng,
        verdict,
        topic,
        title: text[lang].title,
        description: text[lang].description,
        note: text[lang].description,
        transcript: "",
        t: new Date(Date.UTC(2026, 7, 28, 9, 15 + i * 4)).toISOString(),
    }));

export const DEMO_PINS: Record<Lang, Pin[]> = {
    en: seed("en"),
    nl: seed("nl"),
};
