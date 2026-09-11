/* What the capture module reports to the buttons; see `captureState`. */
export type CaptureStatus = {
    rec: boolean;
    lapse: boolean;
    busy: boolean;
    ms: number;
    frames: number;
};
