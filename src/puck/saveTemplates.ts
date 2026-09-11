import { templates } from "../state";
import { TPL_KEY } from "./constants";
import { tplWire } from "./tplWire";

/* What is stored is the measurement, not the puck: `restoreTemplates` only
   ever puts it back on a puck the code already knows. All three shapes go
   along -- a learned ring or grid code used to be lost on the next reload
   because only the triangle fields were written. */
export function saveTemplates(): void {
    try {
        localStorage.setItem(
            TPL_KEY,
            JSON.stringify(templates.list.map(tplWire)),
        );
    } catch (e) {}
}
