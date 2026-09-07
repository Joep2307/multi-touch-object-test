/* A running recording, with one control: stop(). In transcription mode,
   stop() returns a promise that only resolves once the last chunk has been
   sent. */
export interface TalkSession {
    mode: "browser" | "backend" | "audio";
    stop(): void | Promise<void>;
}
