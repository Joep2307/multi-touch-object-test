import { ContactSource } from "./ContactSource";
import { RECORDING_VERSION } from "./constants";
import type { ContactFrame } from "./ContactFrame";
import type { ContactRecording } from "./ContactRecording";

/* Plays a recording back as if it were the glass.
 *
 * Time is mapped rather than assumed: the first call to `frame` decides
 * where the recording's clock is pinned to the caller's clock, and
 * everything after that follows the caller. A test can therefore step
 * through a recorded rotation in fake milliseconds, and the table can
 * play the same recording at real speed, from the same class.
 *
 * The frame handed back carries the caller's `now`, not the recorded
 * timestamp. Everything downstream — dropout windows, tap intervals,
 * velocity — measures against one clock, and mixing a recorded clock
 * into that would make a replayed dropout look either instant or
 * eternal depending on when the recording was made.
 *
 * **Which is why every timestamp on the way out is shifted, not only
 * the frame's.** An earlier version moved `at` onto the caller's clock
 * and left each contact's `firstSeen` and `lastSeen` on the recording's
 * — so a frame arrived carrying two clocks at once. `Tap` measures
 * dwell as `sample.at - firstSeen`, and replaying a recording that
 * started at 80 ms into a caller whose clock stood at 5000 made the
 * very first frame report a dwell of 4920 ms: an instant hold, on
 * arrival, from a puck that had only just been put down. Any trait
 * reading a contact's own timestamps would have inherited the same
 * fault, so the fix belongs here rather than in `Tap`.
 */
export class ReplayContactSource extends ContactSource {
    readonly #frames: readonly ContactFrame[];
    #originNow: number | null = null;
    #index = 0;

    constructor(recording: ContactRecording) {
        super();
        if (recording.version !== RECORDING_VERSION) {
            throw new Error(
                `Recording "${recording.name}" is version ` +
                    `${String(recording.version)}, this build reads ` +
                    `${String(RECORDING_VERSION)}.`,
            );
        }
        this.#frames = recording.frames;
    }

    get done(): boolean {
        return this.#index >= this.#frames.length - 1;
    }

    override frame(now: number): ContactFrame {
        const first = this.#frames[0];
        if (first === undefined) return { at: now, points: [] };
        this.#originNow ??= now;
        const target = first.at + (now - this.#originNow);
        while (this.#index + 1 < this.#frames.length) {
            const next = this.#frames[this.#index + 1];
            if (next === undefined || next.at > target) break;
            this.#index += 1;
        }
        const current = this.#frames[this.#index] ?? first;
        const shift = now - current.at;
        if (shift === 0) return { at: now, points: current.points };
        return {
            at: now,
            points: current.points.map((p) => ({
                ...p,
                firstSeen: p.firstSeen + shift,
                lastSeen: p.lastSeen + shift,
            })),
        };
    }

    override clear(): void {
        this.#originNow = null;
        this.#index = 0;
    }
}
