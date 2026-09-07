import { el } from "../../dom/el";
import { kg } from "../../kg/kg";

export function closeKgInfo(): void {
    kg.selected = null;
    el("kgInfo").style.display = "none";
}
