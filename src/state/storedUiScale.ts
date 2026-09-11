import { UI_SCALES } from "../config/UI_SCALES";
import type { UiMode } from "../types/UiMode";
import { defaultUiScale } from "./defaultUiScale";

/* The scale belongs to the mode and is therefore remembered per mode:
   setting the table to 115% doesn't skew the laptop along with it. */
export function storedUiScale(mode: UiMode): number {
    try {
        const v = parseFloat(
            localStorage.getItem("pucktable-ui-scale-" + mode) ?? "",
        );
        return UI_SCALES.includes(v) ? v : defaultUiScale(mode);
    } catch (e) {
        return defaultUiScale(mode);
    }
}
