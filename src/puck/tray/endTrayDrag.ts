import { CFG } from "../../config/CFG";
import { MV } from "../../map/MV";
import { sim } from "../../state/sim";
import { markTray } from "./markTray";

export function endTrayDrag(e: PointerEvent): void {
    const d = sim.trayDrags.get(e.pointerId);
    if (!d) return;
    const { tpl, ghost, x0, y0 } = d;
    ghost.remove();
    sim.trayDrags.delete(e.pointerId);
    if (Math.hypot(e.clientX - x0, e.clientY - y0) < 24) return; // a tap, not a drag — ignore
    // Drop where released; if that's still under a panel, slide it toward the middle
    // until it clears, so the puck actually lands somewhere visible on the table.
    let x = e.clientX,
        y = e.clientY;
    // Only panels that are actually present: a closed menu or panel has an
    // empty rect at 0,0 and would otherwise block the entire top-left corner.
    const panels = [
            ...document.querySelectorAll<HTMLElement>(".panel"),
        ].filter((p) => p.getBoundingClientRect().width > 0),
        M = CFG.ringPX + 24;
    const buried = () =>
        panels.some((p) => {
            const r = p.getBoundingClientRect();
            return (
                x >= r.left - M &&
                x <= r.right + M &&
                y >= r.top - M &&
                y <= r.bottom + M
            );
        });
    for (let i = 0; i < 400 && buried(); i++) {
        x += (innerWidth / 2 - x) * 0.05;
        y += (innerHeight / 2 - y) * 0.05;
    }
    const ll = MV.unproject(x, y);
    // Every drag copy gets its own number. The kind no longer says which one
    // it is -- two of the same kind may be present -- but recognition still
    // needs to be able to tell the contact points of two pucks apart.
    sim.pucks.push({
        tpl,
        uid: ++sim.seq,
        x,
        y,
        lng: ll.lng,
        lat: ll.lat,
        rot: Math.random() * Math.PI * 2,
    });
    markTray();
}
