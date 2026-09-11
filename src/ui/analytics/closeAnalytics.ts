import { el } from "../../dom";

export function closeAnalytics(): void {
    el("analytics").classList.remove("open");
}
