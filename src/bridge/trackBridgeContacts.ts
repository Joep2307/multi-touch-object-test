import type { TouchPoint } from "../types";
import type { TrackBridgeContact } from "./TrackBridgeContact";

/* Name the contacts the recogniser saw, in the order it saw them.
 *
 * Takes the very array that was handed to `recognise()` rather than
 * rebuilding an equivalent one, and that is the point: a detection's
 * `contactIndices` index into that array, so two lists that merely happen
 * to agree today would put the new model on the wrong feet the first time
 * anything reordered either of them.
 *
 * The identity itself is already on the point — a pointer id from the
 * browser, or a negative id from `simContactId` — so this only has to say
 * which kind it is. */
export function trackBridgeContacts(
    points: readonly TouchPoint[],
): TrackBridgeContact[] {
    return points.map((point) => {
        const simulated = point.sim === true;
        return {
            sourceId: `${simulated ? "simulated" : "pointer"}:${point.id}`,
            x: point.x,
            y: point.y,
            radiusPX: 0,
            simulated,
        };
    });
}
