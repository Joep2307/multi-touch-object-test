import type { Template } from "../../types/Template";
import { isRing } from "./isRing";
import { isSlotted } from "./isSlotted";
import { tplRing } from "./tplRing";
import { tplLongest } from "../tplLongest";

/* How wide a puck lies on the glass: the longest side for a triangle, the
   diameter for a ring. This measure sets the search grid in `recognise`. */
export const tplSpanMM = (t: Template): number =>
    isRing(t) || isSlotted(t) ? 2 * tplRing(t) : tplLongest(t);
