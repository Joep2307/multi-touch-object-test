import type { ContactSet } from "../contact/ContactSet";
import type { FootprintSpec } from "./FootprintSpec";

/* One frame of input for every trait on a base.
 *
 * `pxPerMM` is carried in the sample rather than read from anywhere,
 * and that is deliberate: `Position` measures in pixels and needs the
 * scale to judge whether what it measured is the right size, while
 * `PxPerMMEstimator` derives a better scale *from* that measurement
 * for the next frame. Passing it in makes that a one-frame feedback
 * loop with an obvious direction, instead of two things reading a
 * shared global and quietly disagreeing.
 */
export type BaseSample = {
    readonly at: number;
    readonly contacts: ContactSet;
    readonly spec: FootprintSpec;
    readonly pxPerMM: number;
};
