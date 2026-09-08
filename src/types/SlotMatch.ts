/* How well a measured grid code fits one template: `miss` feet the template
   has and the measurement doesn't, `extra` the other way round, `err` the
   two added up, `rot` how many slots the template had to turn, and `angle`
   the puck's direction in radians -- read from all the feet at once, so it
   is finer than one slot. */
export interface SlotMatch {
    err: number;
    miss: number;
    extra: number;
    rot: number;
    angle: number;
}
