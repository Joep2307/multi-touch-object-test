import { download } from "../dom/download";
import type { BaseSessionRecorder } from "./BaseSessionRecorder";

/* The controls for a recording session, on the same pattern as
   `installTestHooks`: only ever present on a URL that asked for them.
 *
 * Two ways in, because the table and the laptop are different places.
 * At the table there is no console — it is a kiosk — so there are
 * keys, chosen with two modifiers so no visitor can reach them by
 * accident. On a laptop `window.__base` is easier to drive and can be
 * scripted.
 *
 * Nothing here runs unless `?base` is on the URL.
 */
export function installBaseHooks(recorder: BaseSessionRecorder): void {
    const startedAt = (): number => performance.now();

    const start = (name = "table"): string => {
        recorder.start(name, startedAt());
        return `recording "${name}"`;
    };
    const save = (): string => {
        const json = recorder.toJSON(new Date().toISOString());
        if (json === null) return "nothing captured — was it armed?";
        download(recorder.fileName(), json, "application/json");
        return `saved ${recorder.fileName()} (${String(
            recorder.frameCount,
        )} frames)`;
    };
    const parity = (): string => recorder.paritySummary();

    window.__base = {
        start,
        stop: () => {
            recorder.stop();
            return "stopped";
        },
        save,
        parity,
        get recording() {
            return recorder.recording;
        },
        get frames() {
            return recorder.frameCount;
        },
    };

    addEventListener("keydown", (e) => {
        if (!e.shiftKey || !e.altKey) return;
        switch (e.key.toLowerCase()) {
            case "r": {
                e.preventDefault();
                if (recorder.recording) {
                    recorder.stop();
                    console.info("stopped");
                } else {
                    console.info(start());
                }
                break;
            }
            case "s": {
                e.preventDefault();
                console.info(save());
                break;
            }
            case "p": {
                e.preventDefault();
                console.info(parity());
                break;
            }
            default:
                break;
        }
    });
}
