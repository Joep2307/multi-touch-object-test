import { templates } from "../state";
import { OWN_KEY } from "./constants";
import { tplWire } from "./tplWire";

/* Through `tplWire`, so all three shapes go to disk. Writing only the
   triangle fields is what made a puck learned in the stand as a ring or a
   grid code disappear on the next reload: it was saved without the
   numbers that said what it was, and `restoreOwnPucks` then had nothing
   to recognise it by. `saveTemplates` had exactly this bug and exactly
   this fix. */
export function saveOwnPucks(): void {
    try {
        localStorage.setItem(
            OWN_KEY,
            JSON.stringify(templates.own.map(tplWire)),
        );
    } catch (e) {}
}
