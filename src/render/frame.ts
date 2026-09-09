import {
    BaseSessionRecorder,
    ParityCheck,
    TrackBridge,
    drawBaseOverlay,
    installBaseHooks,
    trackBridgeContacts,
} from "../bridge";
import { QS } from "../config/QS";
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
import type { Track } from "../types/Track";
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

const BASE_PARITY_ENABLED = QS.has("base") && QS.get("base") !== "0";
let baseBridge: TrackBridge | null = null;
let parityCheck: ParityCheck | null = null;
let baseRecorder: BaseSessionRecorder | null = null;
let baseParityFailed = false;

/* FRAME — the render loop. */
export function frame(): void {
    requestAnimationFrame(frame);
    const now = performance.now();
    const ctx = view.ctx;
    syncSimPucksToMap();
    const simulated = ui.simMode ? simPads() : [];
    const points: TouchPoint[] = [...touches.real.values(), ...simulated];
    const { pucks: dets, usedIdx } = recognise(points);
    const tracked = track(dets, now);
    const pucks = tracked.pucks;
    if (BASE_PARITY_ENABLED) {
        /* The parity bridge is a diagnostic, and a diagnostic must
           never be able to take the table down. `frame()` schedules
           its successor first, so a throw here would not stop the
           loop — it would skip every draw call below, on this frame
           and on every frame after it, leaving a black screen with
           the public in front of it. Caught once, reported once. */
        try {
            baseBridge ??= new TrackBridge(view.pxPerMM);
            parityCheck ??= new ParityCheck();
            if (baseRecorder === null) {
                baseRecorder = new BaseSessionRecorder(
                    baseBridge,
                    parityCheck,
                );
                installBaseHooks(baseRecorder);
            }
            baseBridge.update(
                now,
                trackBridgeContacts([...touches.real.entries()], simulated),
                tracked.assignments,
            );
            compareBaseParity(now, pucks, baseBridge, parityCheck);
            baseRecorder.capture();
        } catch (e) {
            if (!baseParityFailed) {
                baseParityFailed = true;
                console.error("base parity disabled after an error", e);
            }
            baseBridge = null;
            parityCheck = null;
        }
    }
    if (learn.open) updateLearn(now);

    paintMapLayer();
    if (tiles.bakePending) {
        tiles.bakePending = false;
        bakeMap();
    }
    drawGaps(ctx);
    drawKG(ctx);

    drawPuckKnowledgeRelations(ctx, pucks);
    drawPins(ctx);
    for (const t of pucks) drawPuck(ctx, t, now);
    if (baseBridge !== null && parityCheck !== null) {
        drawBaseOverlay(
            ctx,
            baseBridge,
            parityCheck,
            view.W,
            view.H,
            now,
            baseRecorder,
        );
    }

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

function compareBaseParity(
    at: number,
    pucks: readonly Track[],
    bridge: TrackBridge,
    parity: ParityCheck,
): void {
    const oldById = new Map(pucks.map((puck) => [puck.id, puck]));
    const ids = new Set([...oldById.keys(), ...bridge.trackIds()]);
    for (const id of ids) {
        const puck = oldById.get(id);
        const physical = bridge.physicalForTrack(id);
        const snapshot = physical?.base.snapshot(at);
        const position = snapshot?.position;
        const direction = snapshot?.direction;
        const centre = position?.centre ?? null;
        parity.compare(
            at,
            id,
            puck?.tpl.id ?? physical?.kind.id ?? "unknown",
            {
                seen: puck !== undefined,
                x: puck?.x ?? 0,
                y: puck?.y ?? 0,
                angleDeg:
                    puck === undefined
                        ? null
                        : (puck.filteredAngle * 180) / Math.PI,
            },
            {
                seen: position?.sensed === true && centre !== null,
                x: centre?.x ?? 0,
                y: centre?.y ?? 0,
                angleDeg:
                    direction?.known === true ? direction.headingDeg : null,
            },
        );
    }
}
