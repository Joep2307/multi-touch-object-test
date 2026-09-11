import type { Pin } from "../types";

/* ── Transcribing the conversation ────────────────────────────────────────
   What gets typed is a summary; the conversation around it is what it was
   all about. Once a location and a topic are set, the group can press
   record here and just keep talking — the text streams into the window and
   stays attached to that one marker.

   The source of truth is `pin.transcript`, not the text field: multiple
   people work at this table at the same time, and someone editing partway
   through a sentence shouldn't lose that to the next chunk of speech. speech
   therefore delivers finished chunks, which we append at the end. */
export const talkTextOf = (pin: Pin | null | undefined): string =>
    typeof pin?.transcript === "string" ? pin.transcript : "";
