import {
    BaseRuntime,
    BaseSessionRecorder,
    ParityCheck,
    TrackBridge,
    drawBaseOverlay,
    drawRenderPlan,
    installBaseHooks,
    trackBridgeContacts,
} from "../bridge";
import { QS } from "../config";
import { realTouchPoints } from "../input";
import { drawGaps, drawKG } from "../kg";
import { bakeMap, paintMapLayer } from "../map";
import { recognise } from "../puck/geometry";
import { updateLearn } from "../puck/learn";
import { updateNoise } from "../puck/noise";
import { simPads, syncSimPucksToMap } from "../puck/sim";
import { track } from "../puck";
import { learn, tiles, ui, view } from "../state";
import { updateUI } from "../ui";
import { drawDebugPoints } from "./drawDebugPoints";
import { drawLockBadge } from "./drawLockBadge";
import { drawNoise } from "./drawNoise";
import { drawNoteTether } from "./drawNoteTether";
import { drawPins } from "./drawPins";
import { drawPuckKnowledgeRelations } from "./drawPuckKnowledgeRelations";
import { drawPuck } from "./drawPuck";
import { drawResetProgress } from "./drawResetProgress";
import type { TouchPoint, Track } from "../types";

const BASE_PARITY_ENABLED = QS.has("base") && QS.get("base") !== "0";
let baseBridge: TrackBridge | null = null;
let parityCheck: ParityCheck | null = null;
let baseRecorder: BaseSessionRecorder | null = null;
let baseRuntime: BaseRuntime | null = null;
let baseHooksInstalled = false;
let baseParityFailed = false;

/* FRAME — the render loop. */
export function frame(): void {
    requestAnimationFrame(frame);
    const now = performance.now();
    const ctx = view.ctx;
    syncSimPucksToMap();
    const simulated = ui.simMode ? simPads() : [];
    const points: TouchPoint[] = [...realTouchPoints(), ...simulated];
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
            baseRuntime ??= new BaseRuntime();
            baseRecorder ??= new BaseSessionRecorder(baseBridge, parityCheck);
            /* Once for the life of the page. The hooks reach the
               recorder and the runtime through getters, so rebuilding
               either after a failure needs no second install — and a
               second install would add a second keydown listener, so
               every shortcut would fire twice and cancel itself. */
            if (!baseHooksInstalled) {
                baseHooksInstalled = true;
                installBaseHooks(
                    () => baseRecorder,
                    () => baseRuntime,
                );
            }
            baseBridge.update(
                now,
                trackBridgeContacts(points),
                tracked.assignments,
            );
            compareBaseParity(now, pucks, baseBridge, parityCheck);
            baseRecorder.capture();
            /* The new model, running beside the table and touching
               nothing: its outbox is drained and discarded, so no
               rule can reach anything the public sees. */
            baseRuntime.load(baseBridge);
            baseRuntime.update(baseBridge, now, view.pxPerMM);
        } catch (e) {
            if (!baseParityFailed) {
                baseParityFailed = true;
                console.error("base parity disabled after an error", e);
            }
            /* The recorder too. It was built around the bridge and
               the parity check being thrown away here, so leaving it
               alive left it capturing a bridge nobody was advancing:
               the same frozen frame thousands of times over, beside a
               parity summary reading a counter nobody updates. */
            baseBridge = null;
            parityCheck = null;
            baseRuntime = null;
            baseRecorder = null;
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
    if (baseRuntime !== null) {
        /* What the model would have drawn, over what the table did
           draw. A diagnostic: the plan holds no instance, no session
           and no rule, so painting it cannot feed anything back. */
        const plan = baseRuntime.renderPlan;
        if (plan !== null) drawRenderPlan(ctx, plan);
    }
    if (baseBridge !== null && parityCheck !== null) {
        drawBaseOverlay(ctx, baseBridge, view.W, view.H, now);
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
