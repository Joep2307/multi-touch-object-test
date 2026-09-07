import { kgUrl } from "../../config/kgUrl";
import { el } from "../../dom/el";
import { kg } from "../../kg/kg";
import { kgStatusText } from "../../kg/kgStatusText";
import { loadKG } from "../../kg/loadKG";
import { markLayerMenu } from "../menu/markLayerMenu";

/* Lines without points say nothing, so this toggle also turns on the graph
   layer when needed. The reverse too: if the graph goes off, the lines go
   with it. */
export async function toggleRelations(): Promise<void> {
    kg.relations = !kg.relations;
    markLayerMenu();
    if (!kg.relations) return;
    if (!kg.enabled) {
        kg.enabled = true;
        el("btnKg").classList.add("on");
    }
    if (!kg.nodes.length) await loadKG(kgUrl());
    else el("kgStatus").textContent = kgStatusText();
}
