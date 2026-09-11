import { scale } from "../../state/scale";
import { view } from "../../state/view";

/* Put the two halves of the scale together. Everything that draws or
   recognises reads `view.pxPerMM`, and this is the only place that writes
   it, so the seed and the correction can never drift apart. */
export function syncPxPerMM(): void {
    view.pxPerMM = scale.seed * scale.k;
}
