import { el } from "../../dom";
import { tr } from "../../i18n";
import { toggleGaps, toggleRelations } from "../kgInfo";
import { layerButton } from "./layerButton";
import { markLayerMenu } from "./markLayerMenu";

/* ── Map layers ────────────────────────────────────────────────────────
   The menu is built from the <select> in the control panel, so there
   remains a single source of truth: you add a map style there in the
   HTML, and it appears here automatically. */
export function buildLayerMenu(): void {
    const box = el("layersBody");
    box.innerHTML = "";

    /* At the top, the layers that sit over the map. The map style underneath
     is a choice of one; these are toggles, hence the separation. */
    const overlayHead = document.createElement("p");
    overlayHead.className = "eyebrow";
    overlayHead.textContent = tr("overlaysHead");
    box.appendChild(overlayHead);

    const gaps = document.createElement("button");
    gaps.type = "button";
    gaps.className = "layer";
    gaps.id = "btnGaps";
    gaps.textContent = tr("docDensity");
    gaps.onclick = toggleGaps;
    box.appendChild(gaps);

    const note = document.createElement("p");
    note.className = "hint";
    note.style.margin = "6px 0 0";
    note.textContent = tr("gapsNote");
    box.appendChild(note);

    const rel = document.createElement("button");
    rel.type = "button";
    rel.className = "layer";
    rel.id = "btnRelations";
    rel.textContent = tr("relations");
    rel.onclick = toggleRelations;
    box.appendChild(rel);

    const relNote = document.createElement("p");
    relNote.className = "hint";
    relNote.style.margin = "6px 0 0";
    relNote.textContent = tr("relationsNote");
    box.appendChild(relNote);

    const mapHead = document.createElement("p");
    mapHead.className = "eyebrow layer-basemap-head";
    mapHead.textContent = tr("basemap");
    box.appendChild(mapHead);

    for (const child of el<HTMLSelectElement>("tiles").children) {
        if (child instanceof HTMLOptGroupElement) {
            const h = document.createElement("p");
            h.className = "eyebrow layer-group-head";
            h.textContent = tr(child.dataset.i18nLabel || "") || child.label;
            box.appendChild(h);
            for (const o of child.children)
                box.appendChild(layerButton(o as HTMLOptionElement));
        } else box.appendChild(layerButton(child as HTMLOptionElement));
    }
    markLayerMenu();
}
