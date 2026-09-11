import { el } from "../../dom";
import { tr } from "../../i18n";
import { kg, kgDescribe } from "../../kg";
import { flippedFor } from "../../notes";
import { resetPanelOffset } from "../panels";
import { openDocument } from "./openDocument";
import { positionKgInfo } from "./positionKgInfo";
import { showKgKnowledge } from "./showKgKnowledge";
import type { KgNode } from "../../types";

/* ── Knowledge graph: the reading window for a tapped point ──────────── */
export function openKgInfo(node: KgNode, x: number, y: number): void {
    kg.selected = node;
    const n = el("kgInfo");
    resetPanelOffset(n);
    n.style.display = "block";
    n.style.setProperty("--kg-flip", flippedFor(y) ? "180deg" : "0deg");
    n.dataset.anchorX = String(x);
    n.dataset.anchorY = String(y);
    positionKgInfo();
    el("kgInfoType").textContent = kgDescribe(node);
    el("kgInfoLabel").textContent = node.label;
    const body = el("kgInfoBody");
    body.textContent = "";
    const rel = (kg.linksOf.get(node.id) || new Set()).size;
    if (rel) {
        const p = document.createElement("p");
        p.className = "kg-quote";
        p.style.borderLeftColor = "rgba(122,162,247,.5)";
        p.textContent = tr("conn", rel);
        body.appendChild(p);
    }
    const open = el("kgInfoOpen");
    open.textContent =
        node.type === "document" ? tr("openDoc") : tr("whatSaidAbout");
    open.onclick = () => {
        if (node.type === "document") {
            openDocument(node.id, node.label);
            return;
        }
        showKgKnowledge(node);
    };
}
