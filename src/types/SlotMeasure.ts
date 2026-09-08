/* The median of a learning series for a grid puck: which slots were
   occupied, and how wide the ring is in pixels. */
export interface SlotMeasure {
    slot: true;
    ring?: false;
    duo?: false;
    slots: number;
    code: number;
    radius: number;
}
