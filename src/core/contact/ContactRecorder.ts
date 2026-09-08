import { RECORDING_MAX_FRAMES, RECORDING_VERSION } from "./constants";
import type { ContactFrame } from "./ContactFrame";
import type { ContactRecording } from "./ContactRecording";

/* Captures frames into a `ContactRecording`.
 *
 * Frames are kept as they arrive, uncompressed. A frame is a handful of
 * numbers and a minute of them is a few hundred kilobytes; the moment
 * this stores deltas instead, a recording stops being readable by eye,
 * and being readable by eye is half of what a fixture is for.
 *
 * `recordedAt` is passed in rather than read from the clock. The core
 * takes no ambient dependencies — not even the date — because a test
 * that produces a different file every run cannot be diffed.
 */
export class ContactRecorder {
    readonly #frames: ContactFrame[] = [];
    readonly #name: string;
    readonly #maxFrames: number;
    #dropped = 0;

    constructor(name: string, maxFrames: number = RECORDING_MAX_FRAMES) {
        this.#name = name;
        this.#maxFrames = maxFrames;
    }

    add(frame: ContactFrame): void {
        if (this.#frames.length >= this.#maxFrames) {
            this.#dropped += 1;
            return;
        }
        this.#frames.push(frame);
    }

    get frameCount(): number {
        return this.#frames.length;
    }

    /* How many frames were thrown away because the cap was reached.
       Surfaced rather than hidden: a recording that quietly stopped
       halfway looks exactly like a puck that quietly stopped moving. */
    get droppedCount(): number {
        return this.#dropped;
    }

    finish(recordedAt: string): ContactRecording {
        return {
            version: RECORDING_VERSION,
            name: this.#name,
            recordedAt,
            frames: [...this.#frames],
        };
    }

    reset(): void {
        this.#frames.length = 0;
        this.#dropped = 0;
    }
}
