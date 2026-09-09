import { ContactRecorder } from "../core/contact";
import type { ParityCheck } from "./ParityCheck";
import type { TrackBridge } from "./TrackBridge";

/* Captures a real session at the table: the contact stream the new
   model saw, and how far it drifted from the old pipeline.
 *
 * Everything in phases 1, 2 and 6 that is still open needs recordings
 * from the actual glass — a foot trembling two millimetres, one foot
 * dropping out mid-rotation, a palm resting on the table. None of that
 * can be synthesised honestly, and until now nothing could capture it:
 * `ContactRecorder` existed but was wired to nothing, so the recording
 * session had no way to happen. This is that wiring.
 *
 * Deliberately DOM-free — it hands back strings and someone else turns
 * them into a file. That keeps it testable and keeps the decision about
 * *how* a file reaches the disk in one place.
 *
 * The contact stream is taken from the bridge rather than from the
 * pointer events, so what gets recorded is exactly what the model was
 * fed, including the stable source identities. A recording that
 * replayed differently from the session it came from would be worse
 * than no recording.
 */
export class BaseSessionRecorder {
    #recorder: ContactRecorder | null = null;
    #armed = false;
    #name = "";
    #startedAt = 0;
    #frozenMS = 0;

    constructor(
        private readonly bridge: TrackBridge,
        private readonly parity: ParityCheck,
    ) {}

    get recording(): boolean {
        return this.#armed;
    }

    /* There is something worth saving: captured, and not still
       capturing. */
    get saveable(): boolean {
        return !this.#armed && this.frameCount > 0;
    }

    get frameCount(): number {
        return this.#recorder?.frameCount ?? 0;
    }

    get name(): string {
        return this.#name;
    }

    start(name: string, at: number): void {
        this.#name = name;
        this.#startedAt = at;
        this.#recorder = new ContactRecorder(name);
        this.#frozenMS = 0;
        this.#armed = true;
        this.parity.reset();
    }

    /* Stops capturing and **keeps** what was captured.
     *
     * It used to drop the recording on the floor, which made saving
     * impossible: stop cleared the frames, so the save button saw an
     * empty recorder and disabled itself, and the only moment the data
     * existed was while recording — exactly when saving is not
     * offered. Nothing in the tests caught it because none of them
     * stopped before saving, which is the only order a person would
     * ever use. */
    stop(at: number): void {
        this.#frozenMS = Math.max(0, at - this.#startedAt);
        this.#armed = false;
    }

    /* How long this recording has run, in milliseconds. Frozen once
       stopped, so the button can keep showing what was captured
       instead of a number that carries on climbing. Seconds are what
       a person at the table is actually counting — ten of them per
       situation — so frames are the wrong unit to put on a button. */
    elapsedMS(at: number): number {
        return this.#armed
            ? Math.max(0, at - this.#startedAt)
            : this.#frozenMS;
    }

    /* Called once per frame while armed. Cheap enough to leave in the
       loop: one push of a frame that already exists. */
    capture(): void {
        if (!this.#armed) return;
        this.#recorder?.add(this.bridge.contactFrame);
    }

    /* The recording, ready to be written to a file. Null when nothing
       has been captured — saving an empty file after a session that
       silently failed to arm is exactly the disappointment this
       avoids. */
    toJSON(recordedAt: string): string | null {
        if (this.#recorder === null || this.#recorder.frameCount === 0) {
            return null;
        }
        return JSON.stringify(this.#recorder.finish(recordedAt), null, 2);
    }

    fileName(): string {
        const safe = this.#name.replace(/[^a-zA-Z0-9-]+/g, "-");
        return `contacts-${safe}-${Math.round(this.#startedAt)}.json`;
    }

    /* A summary a person can read out loud at the table, because that
       is where the decision gets made. `worst` matters more than the
       rate: an average hides the one frame in a thousand where a puck
       jumped, and that frame is the bug. */
    paritySummary(): string {
        const frames = this.parity.frameCount;
        const diverged = this.parity.divergenceCount;
        const rate = frames === 0 ? 0 : (diverged / frames) * 100;
        const worst = this.parity.worst();
        const lines = [
            `frames compared : ${String(frames)}`,
            `divergences     : ${String(diverged)} (${rate.toFixed(2)}%)`,
        ];
        if (worst === null) {
            lines.push("worst           : none — the two agreed throughout");
        } else if (worst.centreOffPX === null) {
            lines.push(
                `worst           : only one pipeline saw ${worst.trackId} ` +
                    `(old=${String(worst.seenByOld)} ` +
                    `new=${String(worst.seenByNew)})`,
            );
        } else {
            lines.push(
                `worst           : ${worst.centreOffPX.toFixed(1)} px, ` +
                    `${(worst.angleOffDeg ?? 0).toFixed(2)}deg ` +
                    `on ${worst.kindId}`,
            );
        }
        lines.push(`captured frames : ${String(this.frameCount)}`);
        return lines.join("\n");
    }
}
