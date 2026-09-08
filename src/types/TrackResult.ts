import type { Track } from "./Track";
import type { TrackAssignment } from "./TrackAssignment";

/* Both products of one tracking pass: what the UI may render, and the
   complete detection-to-track pairing needed by the parity bridge. */
export type TrackResult = {
    readonly pucks: Track[];
    readonly assignments: readonly TrackAssignment[];
};
