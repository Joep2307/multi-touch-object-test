import { el } from "../dom";
import { tr } from "../i18n";
import { MV } from "../map";

/* This is the only text input on the map side, and it used to fail
   completely silently: offline, on a typo, or hitting Nominatim's rate
   limit, literally nothing happened. Someone who types "Ginneken", presses
   Enter and sees nothing happen concludes the table is broken. Now there's
   text below the field saying what's going on, and there's a timeout on it. */
export async function onSearchKeydown(e: KeyboardEvent): Promise<void> {
    if (e.key !== "Enter") return;
    const q = (e.target as HTMLInputElement).value.trim(),
        hint = el("searchHint");
    if (!q) {
        hint.textContent = "";
        return;
    }
    hint.textContent = tr("searchBusy");
    try {
        const r = await fetch(
            "https://nominatim.openstreetmap.org/search" +
                "?format=json&limit=1&q=" +
                encodeURIComponent(q),
            { signal: AbortSignal.timeout(8000) },
        );
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = (await r.json()) as {
            lat: string;
            lon: string;
            display_name?: string;
        }[];
        if (j[0]) {
            MV.lat = +j[0].lat;
            MV.lng = +j[0].lon;
            MV.zoom = 15;
            hint.textContent = j[0].display_name || "";
        } else hint.textContent = tr("searchNone");
    } catch (err) {
        hint.textContent = tr("searchFailed");
    }
}
