import { download } from "../dom";
import type { BaseRuntime } from "./BaseRuntime";
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
export function installBaseHooks(
    /* Both asked for on every call rather than captured once, and for
       the same reason: the frame loop throws the whole diagnostic away
       if it ever fails, and a hook holding the old objects would go on
       cheerfully reporting a model that had stopped running. The
       recorder used to be the exception, captured by value — so after
       one caught error it stayed bound to the dead bridge and every
       later recording captured that bridge's frozen last frame,
       thousands of byte-identical copies of it, beside a parity
       summary nobody was updating. A recording that replays
       differently from its session is worse than no recording. */
    recorder: () => BaseSessionRecorder | null,
    runtime: () => BaseRuntime | null,
): void {
    const startedAt = (): number => performance.now();
    const STOPPED = "recorder: stopped";

    const start = (name = "table"): string => {
        const r = recorder();
        if (r === null) return STOPPED;
        r.start(name, startedAt());
        return `recording "${name}"`;
    };
    const save = (): string => {
        const r = recorder();
        if (r === null) return STOPPED;
        const json = r.toJSON(new Date().toISOString());
        if (json === null) return "nothing captured — was it armed?";
        download(r.fileName(), json, "application/json");
        return `saved ${r.fileName()} (${String(r.frameCount)} frames)`;
    };
    const parity = (): string => recorder()?.paritySummary() ?? STOPPED;

    window.__base = {
        start,
        stop: () => {
            const r = recorder();
            if (r === null) return STOPPED;
            r.stop(performance.now());
            return "stopped";
        },
        save,
        parity,
        model: () => runtime()?.summary() ?? "model: stopped",
        get recording() {
            return recorder()?.recording ?? false;
        },
        get frames() {
            return recorder()?.frameCount ?? 0;
        },
    };

    addEventListener("keydown", (e) => {
        if (!e.shiftKey || !e.altKey) return;
        switch (e.key.toLowerCase()) {
            case "r": {
                e.preventDefault();
                const r = recorder();
                if (r !== null && r.recording) {
                    r.stop(performance.now());
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
