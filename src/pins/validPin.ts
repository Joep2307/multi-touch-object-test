import { VERDICT_KEYS } from "../config";

/* ═══════════════════════════════════════════════════════════════
   MARKERS — what is allowed back out of storage
   ═══════════════════════════════════════════════════════════════
   Everything said at the table ends up in localStorage, and localStorage
   cannot be trusted: a half-written session, a key from an older version,
   or someone who's been pasting things into the developer console. A single
   marker with an unknown verdict made `vColor()` throw halfway through the
   draw loop, and then everything after that line — the pucks, the ring
   menu — never got drawn again. Every frame, again, until storage was
   cleared. So everything that comes back passes through here first.

   A coordinate you can place on the map. Deliberately stricter than
   `Number.isFinite(+value)`: `+null`, `+""`, `+[]`, and `+false` are all 0,
   and a marker with `lat: null` would therefore end up as a valid point in
   the Gulf of Guinea instead of being discarded. Only a number, or a string
   that is entirely a number, gets through. */
const isCoord = (v: unknown): boolean => {
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v === "string" && v.trim() !== "") return Number.isFinite(+v);
    return false;
};

/* Is this marker allowed back on the table? `verdictKeys` are the verdicts
   the table knows; a marker with a verdict that isn't in there has no
   color and breaks the draw loop. */
export const validPin = (
    p: unknown,
    verdictKeys: Set<string> = VERDICT_KEYS,
): boolean =>
    !!p &&
    typeof p === "object" &&
    !Array.isArray(p) &&
    verdictKeys.has((p as { verdict?: unknown }).verdict as string) &&
    isCoord((p as { lat?: unknown }).lat) &&
    isCoord((p as { lng?: unknown }).lng);
