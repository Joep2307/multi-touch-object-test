import type { InstanceStatus } from "./InstanceStatus";
import type { PresenceState } from "./PresenceState";

/* Project the presence state machine onto what the model reports.
 *
 * `sensed` is this frame's measurement, and it is what separates the
 * two halves of `placed`: an object holding on through a dropout is
 * still placed, but it is not being seen, and a rule that reacts to a
 * reading should know that. Without the second argument, a puck that
 * had briefly lost a foot would report Detected on evidence from
 * several frames ago.
 *
 * `unseen` maps to Removed rather than Missing. An object that was
 * never sensed is not here in the sense Missing means — Missing is
 * "here, and I cannot see it".
 */
export function instanceStatusOf(
    state: PresenceState,
    sensed: boolean,
): InstanceStatus {
    switch (state) {
        case "placed":
            return sensed ? "detected" : "missing";
        case "lifted":
            return "missing";
        case "gone":
        case "unseen":
            return "removed";
    }
}
