import { panels, ui } from "../../state";

/* ── Dragging panels ──────────────────────────────────────────────────
   At a table everyone stands somewhere different, and a panel that sits
   well for one person sits right on top of the piece of map the
   conversation is about for another. Every floating panel can therefore be
   pushed aside — by its header, so that a swipe inside the panel itself
   just stays a swipe.

   The displacement lives in the separate `translate` property and not in
   `transform`: the rotation for the other side and the tilt of the UI live
   in `transform` and so stay intact. `translate` is applied before the
   rotation, so a panel always slides in the direction the finger moves,
   even when it's upside down.

   The offset is in screen pixels, but `translate` computes in the panel's
   own units — which are set to `zoom`. Hence the division: otherwise a
   panel would also slide further away when the UI is scaled up. */
export function applyPanelOffset(panel: HTMLElement): void {
    const o = panels.offsets.get(panel);
    if (!o || (!o.x && !o.y)) {
        panel.style.translate = "";
        panel.classList.remove("moved");
        return;
    }
    panel.style.translate = o.x / ui.scale + "px " + o.y / ui.scale + "px";
    panel.classList.add("moved");
}
