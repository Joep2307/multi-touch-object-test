export const hasMic = (): boolean =>
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
