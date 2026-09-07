import type { Pin } from "../types/Pin";
import type { TalkSession } from "../types/TalkSession";

/* One recording at a time. Opening a second pin stops the first — a
   microphone that keeps quietly listening at a closed window is exactly
   what you don't want at a table with an audience. */
export const talk = {
    session: null as TalkSession | null, // active recording
    pin: null as Pin | null, // pin this recording belongs to
    startedAt: 0,
    tick: null as ReturnType<typeof setInterval> | null,
    audioBlob: null as Blob | null, // only in recording mode: the audio itself
    busy: false,
};
