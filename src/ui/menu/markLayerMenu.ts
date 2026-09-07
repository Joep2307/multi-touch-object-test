import { el } from "../../dom/el";
import { kg } from "../../kg/kg";
import { MV } from "../../map/MV";

export function markLayerMenu(): void {
    [
        ...el("layersMenu").querySelectorAll<HTMLElement>(".layer[data-set]"),
    ].forEach((b) => b.classList.toggle("on", b.dataset.set === MV.set));
    const g = document.getElementById("btnGaps");
    if (g) {
        g.classList.toggle("on", kg.gaps);
        g.setAttribute("aria-pressed", String(kg.gaps));
    }
    const r = document.getElementById("btnRelations");
    if (r) {
        r.classList.toggle("on", kg.relations);
        r.setAttribute("aria-pressed", String(kg.relations));
    }
}
