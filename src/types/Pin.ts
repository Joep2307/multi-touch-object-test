import type { Verdict } from "./Verdict";
import type { ContactDetails } from "./ContactDetails";

/* A marker on the map: what was said, where, and by which kind of puck. */
export interface Pin {
    id: string;
    lat: number;
    lng: number;
    verdict: Verdict;
    topic: string;
    title: string;
    description: string;
    /* Older exports and saved sessions only know `note`; it stays in sync
     with `description`. */
    note: string;
    transcript: string;
    contact?: ContactDetails;
    t: string;
    /* Which table side this marker's window opened toward, if someone
     manually flipped it. Without a choice, the automatic rule applies. */
    flip?: boolean;
    [extra: string]: unknown;
}
