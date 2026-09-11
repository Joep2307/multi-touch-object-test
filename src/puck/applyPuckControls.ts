import { CFG } from "../config";
import { MV } from "../map";
import { ui } from "../state";
import type { Track } from "../types";

/* A puck's two physical degrees of freedom directly control the map:
   turning zooms around its center and sliding travels in that direction. */
export function applyPuckControls(t: Track, now: number): void {
    const dt = t.panT ? Math.min(0.1, (now - t.panT) / 1000) : 0;
    t.panT = now;
    if (t.state !== "recognised" || ui.mapLocked) {
        t.panOX = t.x;
        t.panOY = t.y;
        t.zoomRot = t.angle;
        t.zoomCarry = 0;
        return;
    }
    const rotation = t.angle - t.zoomRot;
    if (Math.abs(rotation) >= CFG.puckRotDeadRAD) {
        t.zoomRot = t.angle;
        const limit = ((CFG.puckRotMaxDegS * Math.PI) / 180) * (dt || 0.1);
        if (Math.abs(rotation) <= limit)
            t.zoomCarry += rotation / ((CFG.puckZoomRotDeg * Math.PI) / 180);
    }
    if (dt && Math.abs(t.zoomCarry) > 0.0001) {
        const ease = 1 - Math.exp((-dt * 1000) / CFG.puckZoomEaseMS);
        const zoom = t.zoomCarry * ease;
        t.zoomCarry -= zoom;
        MV.zoomBy(zoom, t.x, t.y);
    }
    const ox = t.x - t.panOX;
    const oy = t.y - t.panOY;
    const offset = Math.hypot(ox, oy);
    if (dt && offset > CFG.puckPanDeadPX) {
        const travel =
            Math.min(
                (offset - CFG.puckPanDeadPX) * CFG.puckPanGain,
                CFG.puckPanMaxPXS,
            ) * dt;
        MV.panBy((-ox / offset) * travel, (-oy / offset) * travel);
    }
    if (dt && CFG.puckPanEaseMS > 0) {
        const ease = 1 - Math.exp((-dt * 1000) / CFG.puckPanEaseMS);
        t.panOX += ox * ease;
        t.panOY += oy * ease;
    }
}
