/* One frame of a grid puck being learned. The slots are already counted
   from the arrow, so the median doesn't have to align frames afterwards. */
export interface SlotSample {
    slot: true;
    ring?: false;
    duo?: false;
    slots: number;
    code: number;
    size: number;
    cx: number;
    cy: number;
}
