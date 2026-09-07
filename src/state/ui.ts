import { CFG } from "../config/CFG";
import type { ColorTheme } from "../types/ColorTheme";
import type { Lang } from "../types/Lang";
import type { UiMode } from "../types/UiMode";
import { storedUiScale } from "../ui/storedUiScale";

/* The state of the controls. What's here is read from localStorage on load,
   so a table that was set to English, or to 115%, stays that way after a
   refresh. Whoever changes a field then calls the matching apply* function,
   which also writes it back out. */
const read = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
};

const lang = ((): Lang => {
    const v = read("pucktable-lang");
    return v === "nl" || v === "en" ? v : "en";
})();

const mode = ((): UiMode => {
    const v = read("pucktable-ui-mode");
    if (v === "touch" || v === "laptop" || v === "puck") return v;
    return matchMedia("(pointer:coarse)").matches ? "touch" : "laptop";
})();

/* Color mode is a deliberate table setting and therefore no longer silently
   follows the operating system once a choice has been made. Without a saved
   choice, we do take the device's preference as a pleasant starting
   point. */
const colorTheme = ((): ColorTheme => {
    const v = read("pucktable-color-theme");
    if (v === "light" || v === "dark") return v;
    return matchMedia("(prefers-color-scheme:light)").matches
        ? "light"
        : "dark";
})();

export const ui = {
    lang,
    mode,
    scale: storedUiScale(mode),
    colorTheme,
    twoSided: read("pucktable-two-sided") === "1",
    controlsFlipped: read("pucktable-controls-flipped") === "1",
    /* Quiet map, loud content; see applyCalm. On by default. */
    calmMap: read("pucktable-calm") !== "0",
    mapLocked: false,
    pinMoveMode: false,
    /* `simMode` determines whether the contact points of tray pucks count
     towards recognition — and the tray isn't a development tool but the
     normal way to work without a physical puck. If this were tied to `DEV`,
     a table without ?dev in the URL would still let the drag copy follow
     your finger, but no puck would ever appear: the puck would be there,
     but have no pads to be recognized by. Hence `true`; the dev button
     "Simulate puck" can still turn it off. */
    simMode: true,
    debugMode: false,
    /* The calibration slider in developer mode overwrites this live. */
    tolerance: CFG.tolerance,
};
