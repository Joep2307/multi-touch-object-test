/* Release the canvas stream behind a recorder. */
export function stopTracks(r: MediaRecorder | null): void {
    try {
        r?.stream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
}
