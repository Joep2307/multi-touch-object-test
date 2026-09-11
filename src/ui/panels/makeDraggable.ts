import { tr } from "../../i18n";
import { dragControl } from "./dragControl";
import { resetPanelOffset } from "./resetPanelOffset";
import { startPanelDrag } from "./startPanelDrag";

export function makeDraggable(
    panel: HTMLElement,
    headSel?: string,
    loose?: boolean,
): void {
    panel.classList.add("panel-draggable");
    const head = headSel ? panel.querySelector<HTMLElement>(headSel) : null;
    if (head) head.classList.add("drag-head");
    let grip: HTMLElement | null = null;
    /* An existing header is itself the grip; no extra icon is needed next to
     it. Only a panel without a header gets an empty drag strip. */
    if (!head) {
        grip = document.createElement("div");
        grip.className = "panel-grip" + (loose ? " loose" : "");
        grip.dataset.i18nTitle = "movePanel";
        grip.dataset.i18nAria = "movePanel";
        grip.title = tr("movePanel");
        grip.setAttribute("aria-label", tr("movePanel"));
        panel.insertBefore(grip, panel.firstChild);
    }
    for (const zone of head ? [head] : [grip!]) {
        zone.addEventListener("pointerdown", (ev) => {
            // A button stays a button.
            if (head && dragControl(ev.target)) return;
            startPanelDrag(panel, zone, ev);
        });
        zone.addEventListener("dblclick", () => resetPanelOffset(panel));
    }
}
