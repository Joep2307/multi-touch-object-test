import { capture } from "../state";
import type { CapEvents } from "../types";

/* ═══════════════════════════════════════════════════════════════
   CAPTURE — the table image as a photo, a recording or a time-lapse
   ═══════════════════════════════════════════════════════════════
   What happens on the table during a session is the actual result:
   where the pucks land, in what order, how the picture fills up. The
   export to GeoJSON and CSV keeps the contributions, but not the
   picture — and the picture is exactly what you show a client later.

   Three ways, one module:

     shot    One still image of the canvas, as PNG.
     rec     A film of the canvas while the conversation runs.
     lapse   A frame every few seconds; at the end they are strung
             together into a short film.

   Why the canvas and not the screen
   ─────────────────────────────────
   `getDisplayMedia()` would take the panels along too, but opens a
   browser picker on every single start. At a kiosk without a mouse
   nobody is there to click it away (see deploy/KIOSK.md) and then
   simply nothing happens. `canvas.captureStream()` asks nothing and
   delivers exactly what we want to keep: the map with the marks on
   it. The panels floating above it are not in it — here that is a
   choice, not a shortcoming.

   The canvas may not be tainted
   ─────────────────────────────
   A tile server without a CORS header shows the image but does not
   let it be read; the canvas is then "tainted" and both `toBlob` and
   the recorder refuse. It is the same limit as saving the map
   offline — `wireCapture` turns the reason "besmet" into the same
   explanation.

   Limits
   ──────
   An afternoon with an audience may not quietly die on a full memory.
   Both the recording and the time-lapse therefore stop by themselves
   once they get too long or too large, and deliver what there is up
   to then.

   The module keeps its state in `src/state/capture.ts`; every other
   file in this folder is one step of it. Nothing runs until this has
   been given the canvas. */
export function initCapture(
    canvas: HTMLCanvasElement,
    events: CapEvents = {},
): void {
    capture.cv = canvas;
    capture.events = events;
}
