/* A time-lapse in progress: the frames so far, their size, and the two
   timers — one that adds a frame, one that moves the clock. */
export type Lapse = {
    timer: number;
    tick: number;
    frames: Blob[];
    bytes: number;
    start: number;
};
