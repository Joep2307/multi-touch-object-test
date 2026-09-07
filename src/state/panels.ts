/* Moved panels: element → offset in screen pixels. The offsets are
   deliberately not persisted: after a refresh, the table is back to how
   it's meant to be. `dragEnd` is when the last drag or swipe ended: the
   click that follows it must not press a button. */
export const panels = {
    offsets: new Map<HTMLElement, { x: number; y: number }>(),
    dragEnd: 0,
};
