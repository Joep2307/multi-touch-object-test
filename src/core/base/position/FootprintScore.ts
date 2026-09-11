/* What `scoreFootprint` answers: the confidence in a reading, and the
   part of it that does not depend on the screen scale (see there for
   why that part is kept apart). */
export type FootprintScore = {
    readonly confidence: number;
    readonly shapeConfidence: number;
};
