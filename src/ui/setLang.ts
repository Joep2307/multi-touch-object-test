import { ui } from "../state/ui";
import { applyLang } from "./applyLang";

export function setLang(next: string): void {
    if (next !== "nl" && next !== "en") return;
    if (next === ui.lang) {
        applyLang();
        return;
    }
    ui.lang = next;
    try {
        localStorage.setItem("pucktable-lang", ui.lang);
    } catch (e) {}
    applyLang();
}
