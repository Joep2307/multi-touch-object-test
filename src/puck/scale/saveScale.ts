import { scale } from "../../state/scale";

export const SCALE_KEY = "pucktable-scale";

/* Keep the correction, not the scale: a factor still means something on a
   screen of another size, where a number of pixels per millimetre would
   not. A table that has seen one puck starts every later session already
   calibrated, which is the calibration step nobody has to remember. */
export function saveScale(): void {
    try {
        localStorage.setItem(SCALE_KEY, scale.k.toFixed(5));
    } catch (e) {}
}
