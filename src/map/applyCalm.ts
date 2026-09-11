import { el } from "../dom";
import { tr } from "../i18n";
import { ui, view } from "../state";

/* Quiet map, loud content. A map is designed to be saturated: white roads,
   blue water, green areas. On top of that we place four verdict colors and
   a blue button, and then the content fights its own background. Calmed
   down, the map goes back to being what it is here — where something is
   located — and the markers become the only saturated thing on the table.
   Works on any map view, including an aerial photo and an offline-saved
   image, since it operates on the rendering rather than the source. */
export function applyCalm(): void {
    el("btnCalm").classList.toggle("on", ui.calmMap);
    el("btnCalm").textContent = ui.calmMap ? tr("calmOn") : tr("calm");
    view.mapRenderKey = "";
    try {
        localStorage.setItem("pucktable-calm", ui.calmMap ? "1" : "0");
    } catch (e) {}
}
