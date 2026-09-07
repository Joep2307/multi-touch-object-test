import type { Pin } from "./Pin";
import type { Side } from "./Side";

/* One note window — there are two, one per table side. Without a suffix
   it's the front side (`#note`); the other side is a clone whose every id
   got a "-b" appended. */
export interface NoteView {
    side: Side;
    suffix: string;
    el: HTMLElement;
    pin: Pin | null;
    askAbort: AbortController | null;
    flip: boolean;
    /* The message under the conversation field, as a key: on a language
     switch the same sentence should appear in the other language. */
    talkMsg: { key: string; args: unknown[]; warn: boolean };
}
