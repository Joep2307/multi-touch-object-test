import type { ContactStatus } from "./ContactStatus";
import type { SensedContact } from "./SensedContact";

/* A captured stream of frames, and the only file format this layer
   owns.
 *
 * The whole plan rests on being able to replay a real afternoon at the
 * table inside a test. A bug that only shows when a foot drops out
 * halfway through a rotation is not reproducible by hand; recorded once
 * it is reproducible forever, and it stays reproducible after the
 * geometry moves to Rust.
 *
 * `version` is checked on load rather than assumed, and typed as a
 * plain number rather than as the current constant: a reader that can
 * only describe recordings it would write itself cannot open the ones
 * already on disk. Fixtures outlive the code that wrote them, and a
 * silently misread recording is worse than one that refuses to load.
 */
/* A contact as it sits on disk. `status` is optional because version 1
   predates it, and those are the only recordings of real pucks that
   exist. */
type RecordedContact = SensedContact & {
    readonly status?: ContactStatus;
};

export type ContactRecording = {
    readonly version: number;
    readonly name: string;
    readonly recordedAt: string;
    readonly frames: readonly {
        readonly at: number;
        readonly points: readonly RecordedContact[];
    }[];
};
