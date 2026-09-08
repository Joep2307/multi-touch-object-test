import type { TrackBridgeContact } from "./TrackBridgeContact";
import type { Point } from "../types/Point";
import type { TouchPoint } from "../types/TouchPoint";

/* Add stable identities without changing what the recogniser sees. Pointer
   ids come from the browser; a simulated foot is identified by its puck and
   its position within that puck's generated pad list. */
export function trackBridgeContacts(
    real: readonly (readonly [number, Point])[],
    simulated: readonly TouchPoint[],
): TrackBridgeContact[] {
    const contacts: TrackBridgeContact[] = real.map(([id, point]) => ({
        sourceId: `pointer:${id}`,
        x: point.x,
        y: point.y,
        radiusPX: 0,
        simulated: false,
    }));
    const nextForPuck = new Map<number, number>();
    for (const point of simulated) {
        const uid = point.uid ?? 0;
        const index = nextForPuck.get(uid) ?? 0;
        nextForPuck.set(uid, index + 1);
        contacts.push({
            sourceId: `simulated:${uid}:${index}`,
            x: point.x,
            y: point.y,
            radiusPX: 0,
            simulated: true,
        });
    }
    return contacts;
}
