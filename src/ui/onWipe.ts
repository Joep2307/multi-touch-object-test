import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { save } from "../pins/save";
import { pins } from "../state/pins";
import { wipe } from "../state/wipe";
import { resetWipeButton } from "./resetWipeButton";

/* `confirm()` appears in the browser's orientation — so upside down for
   half the group — sits outside the UI scale, and freezes the render loop
   while it's open. Two taps on the same button do the same job, in the
   reading direction of whoever presses it. */
export function onWipe(): void {
    const now = performance.now();
    if (wipe.armedAt && now - wipe.armedAt < 4000) {
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
