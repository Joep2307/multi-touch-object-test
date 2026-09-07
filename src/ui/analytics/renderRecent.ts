import { el } from "../../dom/el";
import { escapeHtml } from "../../dom/escapeHtml";
import { topicLabel } from "../../i18n/topicLabel";
import { tr } from "../../i18n/tr";
import { vColor } from "../../i18n/vColor";
import { vName } from "../../i18n/vName";
import { save } from "../../pins/save";
import { pins } from "../../state/pins";
import { renderAnalytics } from "./renderAnalytics";

/* The most recent markers, with a cross per row to remove one. Lives in the
   analytics window: that's where you review what's there, so that's also
   where cleaning up belongs. */
export function renderRecent(): void {
    const safe = escapeHtml;
    const box = el("recentBody");
    box.innerHTML = pins.list.length
        ? pins.list
              .slice(-8)
              .reverse()
              .map(
                  (p) =>
                      `<div class="pin"><i style="background:${vColor(p.verdict)}"></i>
     <div><b>${safe(p.title) || tr("untitled")} - ${safe(topicLabel(p.topic))}</b>
     ${p.description || p.note ? `<div class="description">${safe(p.description || p.note)}</div>` : ""}
     <div class="meta">${vName(p.verdict)} · ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · ${p.t.slice(11, 16)}</div></div>
     <span class="del" data-id="${p.id}">✕</span></div>`,
              )
              .join("")
        : `<p class="empty">${tr("noMarks")}</p>`;
    [...box.querySelectorAll<HTMLElement>(".del")].forEach(
        (b) =>
            (b.onclick = () => {
                const i = pins.list.findIndex((p) => p.id === b.dataset.id);
                if (i >= 0) {
                    pins.list.splice(i, 1);
                    save();
                    renderAnalytics();
                }
            }),
    );
}
