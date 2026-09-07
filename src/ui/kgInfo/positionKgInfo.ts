import { el } from "../../dom/el";
import { ui } from "../../state/ui";

export function positionKgInfo(): void {
    const n = el("kgInfo");
    if (n.style.display !== "block") return;
    const s = ui.scale,
        width = 280 * s,
        height = 120 * s;
    const x = +(n.dataset.anchorX ?? 0) || innerWidth / 2,
        y = +(n.dataset.anchorY ?? 0) || innerHeight / 2;
    n.style.left =
        Math.max(12, Math.min(innerWidth - width - 12, x + 26)) / s + "px";
    n.style.top =
        Math.max(12, Math.min(innerHeight - height - 12, y - height / 2)) / s +
        "px";
}
