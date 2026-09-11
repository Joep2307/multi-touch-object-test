import { capture } from "../state";

/* The file extension for a film: whatever the recorder produced, or the
   last mime it used when the blob does not say. */
export const captureExt = (blob: Blob | null): string =>
    (blob?.type || capture.recMime || "").includes("mp4") ? ".mp4" : ".webm";
