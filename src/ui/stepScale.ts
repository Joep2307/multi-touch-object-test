import { UI_SCALES } from "../config/UI_SCALES";
import { ui } from "../state/ui";
import { applyScale } from "./applyScale";

export function stepScale(step: number): void {
    const i = UI_SCALES.indexOf(ui.scale);
    ui.scale =
        UI_SCALES[
            Math.max(0, Math.min(UI_SCALES.length - 1, (i < 0 ? 2 : i) + step))
        ];
    applyScale();
}
