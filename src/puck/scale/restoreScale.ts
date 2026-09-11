import { SCALE } from "../../config/SCALE";
import { scale } from "../../state/scale";
import { SCALE_KEY } from "./saveScale";

/* Put back what an earlier session measured, if it is still believable.
   Out of range or unreadable means back to 1: a stored value is a
   convenience, never something the table depends on. */
export function restoreScale(): void {
    try {
        const k = parseFloat(localStorage.getItem(SCALE_KEY) ?? "");
        if (!Number.isFinite(k)) return;
        if (k < 1 - SCALE.maxDrift || k > 1 + SCALE.maxDrift) return;
        scale.k = k;
    } catch (e) {}
}
