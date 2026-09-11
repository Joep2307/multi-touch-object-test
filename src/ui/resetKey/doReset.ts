import { flushSave, save } from "../../pins";
import { reset } from "../../state";

/* Start the table over: first flush whatever is still pending — otherwise
   pressing the button costs exactly the sentence someone just typed. */
export function doReset(): void {
    reset.heldAt = 0;
    flushSave();
    save();
    location.reload();
}
