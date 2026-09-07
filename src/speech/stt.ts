/* ═══════════════════════════════════════════════════════════════
   SPEECH — transcribing the table's conversation
   ═══════════════════════════════════════════════════════════════
   This table is mostly about talking. What gets typed into the window is
   the summary from whoever happens to be holding the pen; the conversation
   itself disappears once the group moves on. The modules in src/speech/
   transcribe that conversation while it's happening.

   This is the only place that knows HOW speech becomes text. The rest of
   the app just asks "start" and "stop" and gets chunks of text back. There
   are two sources that do the same job, and probeSTT picks between them:

     backend   A transcription service (whisper) running alongside
               coco-biblio: the table sends chunks of audio to
               POST api/transcribe and gets text back. Nothing leaves the
               table — this is the source we want on the NUC, and the only
               one you can explain to the public.
     browser   The browser's own speech recognition (Web Speech API). Works
               without installing anything, but Chrome sends the audio to
               Google, and a Chromium build without API keys does nothing,
               silently. A fallback, not a destination.

   If neither is available, recording is what's left: the conversation is
   kept as an audio file that you can download and transcribe yourself
   later. Better a recording without text than an afternoon that leaves no
   trace at all.

   Two things you'll run into on the table:
   · The microphone and speech recognition only exist in a "secure
     context". http://localhost counts as one — that's how the kiosk opens
     the table — but http://<ip>:8080 from another laptop doesn't.
     `navigator.mediaDevices` simply isn't there in that case, and that's
     not a malfunction you can code your way around.
   · The microphone permission prompt appears once per browser profile. In
     the kiosk there's no one with a mouse to dismiss it, so chromium is
     started there with --use-fake-ui-for-media-stream (see
     deploy/kiosk.sh). */
export const stt = {
    mode: "onbekend" as "onbekend" | "backend" | "browser" | "audio" | "geen",
    reason: "" as "" | "insecure" | "nomic", // why nothing is possible
    url: "", // address of the transcription service, if there is one
    checked: false,
};
