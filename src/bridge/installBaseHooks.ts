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

    /* Report the outcome on the button itself: there is no console at
       the table, so a save that quietly failed would look exactly like
       one that worked. */
    const reportSave = (button: HTMLButtonElement): string => {
        const before = button.textContent ?? "Bewaar";
        const outcome = save();
        setTimeout(() => {
            button.textContent = before;
        }, 2500);
        return outcome.startsWith("saved") ? "Bewaard \u2713" : "Mislukt";
    };

    window.__base = {
        start,
        stop: () => {
            recorder.stop(performance.now());
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

    /* The buttons are the real control, not a convenience.
       `Shift+Alt+R` assumes a keyboard with an Alt key, and this table
       does not always have one; the kiosk has no address bar to type a
       URL into either, and no console. A tapped button is the only
       thing that can be relied on with pucks on the glass. */
    const bar = document.createElement("div");
    bar.id = "baseTools";
    const rec = document.createElement("button");
    rec.className = "base-tool";
    rec.type = "button";
    const saveBtn = document.createElement("button");
    saveBtn.className = "base-tool";
    saveBtn.type = "button";
    saveBtn.textContent = "Bewaar";

    const paint = (): void => {
        const seconds = Math.floor(
            recorder.elapsedMS(performance.now()) / 1000,
        );
        rec.textContent = recorder.recording
            ? `Stop — ${String(seconds)}s`
            : "Opnemen";
        rec.dataset.armed = recorder.recording ? "1" : "0";
        saveBtn.disabled = recorder.recording || recorder.frameCount === 0;
    };

    rec.addEventListener("click", () => {
        if (recorder.recording) recorder.stop(performance.now());
        else start(`table-${String(Math.round(performance.now() / 1000))}`);
        paint();
    });
    saveBtn.addEventListener("click", () => {
        saveBtn.textContent = reportSave(saveBtn);
        paint();
    });
    /* The frame counter has to move while recording, or there is no way
       to tell a live capture from a dead one. */
    setInterval(paint, 250);
    paint();
    bar.append(rec, saveBtn);
    document.body.append(bar);

    addEventListener("keydown", (e) => {
        if (!e.shiftKey || !e.altKey) return;
        switch (e.key.toLowerCase()) {
            case "r": {
                e.preventDefault();
                if (recorder.recording) {
                    recorder.stop(performance.now());
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
