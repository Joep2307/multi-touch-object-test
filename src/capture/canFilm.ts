import { pickMime } from "./pickMime";

/* Can this browser do video at all? The photo button always works. */
export const canFilm = (): boolean =>
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    !!pickMime();
