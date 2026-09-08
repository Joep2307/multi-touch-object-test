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
        return { at: now, points: current.points };
    }

    override clear(): void {
        this.#originNow = null;
        this.#index = 0;
    }
}
