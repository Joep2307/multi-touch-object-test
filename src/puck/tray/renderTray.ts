import { vColor, vName } from "../../i18n";
import { templates } from "../../state";
import { markTray } from "./markTray";
import { trays } from "./trays";

/* ── Puck tray: drag a mini-puck off the bar to drop it on the table ── */
export function renderTray(): void {
    for (const box of trays()) {
        box.innerHTML = "";
        templates.list.forEach((tpl) => {
            const d = document.createElement("div");
            d.className = "traypuck";
            d.dataset.id = tpl.id;
            d.style.borderColor = vColor(tpl.verdict);
            d.style.color = vColor(tpl.verdict);
            d.textContent = vName(tpl.verdict);
            box.appendChild(d);
        });
    }
    markTray();
}
