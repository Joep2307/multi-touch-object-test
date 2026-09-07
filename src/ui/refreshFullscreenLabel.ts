import { el } from "../dom/el";
import { tr } from "../i18n/tr";

/* ── Fullscreen ────────────────────────────────────────────────────────
   Only the browser bar. The desktop environment's gestures — three
   fingers swiping a workspace away — sit in front of the browser and are
   NOT covered by this; that's what deploy/KIOSK.md is for. */
export function refreshFullscreenLabel(): void {
    const on = !!document.fullscreenElement;
    el("btnFullscreen").textContent = tr(on ? "fullscreenOff" : "fullscreen");
    el("btnFullscreen").classList.toggle("on", on);
}
