import { el } from "../../dom/el";

export function closeAnalytics(): void {
    el("analytics").classList.remove("open");
}
