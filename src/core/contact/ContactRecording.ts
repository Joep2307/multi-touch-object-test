import type { ContactFrame } from "./ContactFrame";
import type { RECORDING_VERSION } from "./constants";

/* A captured stream of frames, and the only file format this layer
   owns.
 *
 * The whole plan rests on being able to replay a real afternoon at the
 * table inside a test. A bug that only shows when a foot drops out
 * halfway through a rotation is not reproducible by hand; recorded once
 * it is reproducible forever, and it stays reproducible after the
 * geometry moves to Rust.
 *
 * `version` is checked on load rather than assumed. Fixtures outlive
 * the code that wrote them, and a silently misread recording is worse
 * than one that refuses to load.
 */
export type ContactRecording = {
    readonly version: typeof RECORDING_VERSION;
    readonly name: string;
    readonly recordedAt: string;
    readonly frames: readonly ContactFrame[];
};
