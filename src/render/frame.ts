import { drawGaps } from "../kg/drawGaps";
import { drawKG } from "../kg/drawKG";
import { bakeMap } from "../map/bakeMap";
import { paintMapLayer } from "../map/paintMapLayer";
import { recognise } from "../puck/geometry/recognise";
import { updateLearn } from "../puck/learn/updateLearn";
import { updateNoise } from "../puck/noise/updateNoise";
import { simPads } from "../puck/sim/simPads";
import { syncSimPucksToMap } from "../puck/sim/syncSimPucksToMap";
import { track } from "../puck/track";
import { learn } from "../state/learn";
import { tiles } from "../state/tiles";
import { touches } from "../state/touches";
import { ui } from "../state/ui";
import { view } from "../state/view";
import type { TouchPoint } from "../types/TouchPoint";
import { updateUI } from "../ui/updateUI";
import { drawDebugPoints } from "./drawDebugPoints";
import { drawLockBadge } from "./drawLockBadge";
import { drawNoise } from "./drawNoise";
import { drawNoteTether } from "./drawNoteTether";
import { drawPins } from "./drawPins";
import { drawPuck } from "./drawPuck";
import { drawPuckKnowledgeRelations } from "./drawPuckKnowledgeRelations";
import { drawResetProgress } from "./drawResetProgress";

/* ═══════════════════════════════════════════════════════════════
   FRAME — the render loop
   ═══════════════════════════════════════════════════════════════ */
export function frame(): void {
    requestAnimationFrame(frame);
    const now = performance.now();
    const ctx = view.ctx;
    paintMapLayer();
    if (tiles.bakePending) {
        tiles.bakePending = false;
        bakeMap();
    }
    drawGaps(ctx);
    drawKG(ctx);

    syncSimPucksToMap();
    const points: TouchPoint[] = [
        ...touches.real.values(),
        ...(ui.simMode ? simPads() : []),
    ];
    const { pucks: dets, usedIdx } = recognise(points);
    const pucks = track(dets, now);
    if (learn.open) updateLearn(now);

    drawPuckKnowledgeRelations(ctx, pucks);
    drawPins(ctx);
    for (const t of pucks) drawPuck(ctx, t, now);

    drawNoteTether(ctx, pucks);
    drawLockBadge(ctx);
    drawResetProgress(ctx, now);

    if (ui.debugMode) {
        drawDebugPoints(ctx, points, usedIdx);
        /* How steadily the glass reports a puck that lies still. Only while
         the diagnosis is on, so it costs nothing the rest of the time. */
        updateNoise(points, now);
        drawNoise(ctx);
    }

    if (now - view.lastUI > 150) {
        view.lastUI = now;
        updateUI(pucks);
    }
}
