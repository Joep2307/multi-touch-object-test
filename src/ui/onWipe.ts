import { cancelCapture } from "../capture";
import { el } from "../dom";
import { tr } from "../i18n";
import { save } from "../pins";
import { pins, wipe } from "../state";
import { resetWipeButton } from "./resetWipeButton";

/* `confirm()` appears in the browser's orientation — so upside down for
   half the group — sits outside the UI scale, and freezes the render loop
   while it's open. Two taps on the same button do the same job, in the
   reading direction of whoever presses it. */
export function onWipe(): void {
    const now = performance.now();
    if (wipe.armedAt && now - wipe.armedAt < 4000) {
        /* A recording or time-lapse belongs to the session that is being
           thrown away. Left running it would keep filming an empty table
           and deliver, quarter of an hour later, a film of a session
           nobody can place any more -- so stop it here. Stopping is not
           discarding: the recorder hands over what it has and
           `wireCapture` saves it, which is what you want when the wipe
           was the end of the afternoon rather than a mistake. */
        cancelCapture();
        pins.list.length = 0;
        save();
        resetWipeButton();
        return;
    }
    wipe.armedAt = now;
    el("btnWipe").classList.add("on");
    el("btnWipe").textContent = tr("wipeAgain");
    setTimeout(() => {
        if (wipe.armedAt && performance.now() - wipe.armedAt >= 4000)
            resetWipeButton();
    }, 4100);
}
