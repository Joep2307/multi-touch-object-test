import { CFG, QS } from "../config";
import { topics } from "../i18n";
import { ringStart } from "../puck/ring";
import { sim, tracks } from "../state";

/* Read-only observability for the browser smoke test. Never exposed on a
   normal table URL. */
export function installTestHooks(): void {
    if (!QS.has("test")) return;
    window.__puck = {
        topics,
        ringStart,
        ringPX: () => CFG.ringPX,
        ringOpen: () => [...tracks.map.values()].map((t) => t.ring),
        tracks: () =>
            [...tracks.map.values()].map((t) => ({
                id: t.id,
                x: t.x,
                y: t.y,
                state: t.state,
                ring: t.ring,
                armed: t.armed,
            })),
        simulated: () => sim.pucks.map((p) => ({ x: p.x, y: p.y })),
    };
}
