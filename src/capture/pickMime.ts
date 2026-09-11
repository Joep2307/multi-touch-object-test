import { MIMES } from "./constants";

/* The first video mime this browser can record, or "" for none. */
export function pickMime(): string {
    if (typeof MediaRecorder === "undefined") return "";
    for (const m of MIMES) {
        try {
            if (MediaRecorder.isTypeSupported(m)) return m;
        } catch (e) {}
    }
    return "";
}
