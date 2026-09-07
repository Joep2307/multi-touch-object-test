import { reset } from "../../state/reset";
import { applyResetKey } from "./applyResetKey";

export function setResetKey(code: string): void {
    reset.key = code;
    reset.learning = false;
    try {
        localStorage.setItem("pucktable-reset-key", code);
    } catch (e) {}
    applyResetKey();
}
