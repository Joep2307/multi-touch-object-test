import { tr, vColor, vName } from "../../i18n";
import { templates } from "../../state";
import { tplSummary } from "../tplSummary";
import { learnStamp } from "./learnStamp";

/* In puck mode there's no longer a tray showing which pucks the table
   knows. That overview lives here instead, with a cross per puck: learning
   and discarding belong together and happen at the same table. */
export function ownPuckList(): string {
    if (!templates.own.length)
        return `<p class="hint">${tr("recogNoneYet")}</p>`;
    return (
        `<p class="learn-which">` +
        `${tr("recogKnown", templates.own.length)}</p>` +
        templates.own
            .map(
                (t) =>
                    `<div class="own-row" style="--c:${vColor(t.verdict)}">
       <b>${vName(t.verdict)}</b>
       <span>${t.id} &middot; ${tplSummary(t)} &middot; ${learnStamp(t)}</span>
       <button class="own-del danger" data-id="${t.id}" ` +
                    `aria-label="${tr("recogRemove")}" ` +
                    `title="${tr("recogRemove")}">&times;</button>
     </div>`,
            )
            .join("")
    );
}
