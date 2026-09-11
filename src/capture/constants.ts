/* Image widths. The table is 4K; a photo at full size is fine, but a
   time-lapse of hundreds of frames at that size does not fit in
   memory. */
export const SHOT_MAX_W = 3840;
export const LAPSE_MAX_W = 1600;
export const JPEG_Q = 0.72;

export const LAPSE_EVERY_MS = 5000; // how often a frame is added
export const LAPSE_PLAY_FPS = 12; // how fast they go by afterwards
export const LAPSE_MAX_FRAMES = 900; // ~75 minutes
export const LAPSE_MAX_BYTES = 120 * 1024 * 1024;

export const REC_FPS = 24;
export const REC_BITRATE = 6_000_000;
export const REC_MAX_MS = 30 * 60 * 1000;
export const REC_MAX_BYTES = 600 * 1024 * 1024;

/* Chromium on the NUC delivers webm/vp9; Safari on a Mac only mp4. A
   browser that knows none of these cannot record video — the photo is
   what remains. */
export const MIMES = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
];
