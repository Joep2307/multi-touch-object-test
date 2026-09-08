import type { Detection } from "./Detection";

/* The match the legacy tracker made this frame. Keeping it explicit lets
   the parity bridge follow exactly the same identity decision instead of
   trying to reconstruct that decision from two nearby poses. */
export type TrackAssignment = {
    readonly detection: Detection;
    readonly trackId: string;
    /* Candidate tracks are deliberately absent from the public tracker
       result. The bridge waits for the same stability threshold. */
    readonly visible: boolean;
};
