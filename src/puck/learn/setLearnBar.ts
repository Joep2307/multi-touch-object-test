import { el } from "../../dom/el";

export function setLearnBar(f: number): void {
    el("learnBar").style.width =
        (Math.max(0, Math.min(1, f)) * 100).toFixed(1) + "%";
}
