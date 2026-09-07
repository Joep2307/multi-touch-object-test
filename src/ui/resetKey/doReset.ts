import { flushSave } from "../../pins/flushSave";
import { save } from "../../pins/save";
import { reset } from "../../state/reset";

/* Start the table over: first flush whatever is still pending — otherwise
   pressing the button costs exactly the sentence someone just typed. */
export function doReset(): void {
    reset.heldAt = 0;
    flushSave();
    save();
    location.reload();
}
