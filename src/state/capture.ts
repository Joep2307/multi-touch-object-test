import type { CapEvents, CapReason, Lapse } from "../types";

/* What the capture module is doing. One recording or one time-lapse at
   a time, never both: the buttons disable each other, and `busy` is the
   moment in between when a finished time-lapse is being assembled into
   a film. `cv` is the canvas `initCapture` was given; until then every
   capture function returns without doing anything. */
export const capture = {
    cv: null as HTMLCanvasElement | null,
    events: {} as CapEvents,
    rec: null as MediaRecorder | null,
    recChunks: [] as Blob[],
    recBytes: 0,
    recStart: 0,
    recTimer: null as ReturnType<typeof setInterval> | null,
    recReason: "stop" as CapReason,
    /* The mime the last recording used; a time-lapse film gets it too,
       so `captureExt` can name the file. */
    recMime: "",
    lapse: null as Lapse | null,
    busy: false,
};
