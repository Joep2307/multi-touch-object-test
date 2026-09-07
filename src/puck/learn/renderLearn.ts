import { VERDICTS } from "../../config/VERDICTS";
import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { vColor } from "../../i18n/vColor";
import { vName } from "../../i18n/vName";
import { learn } from "../../state/learn";
import { templates } from "../../state/templates";
import { view } from "../../state/view";
import type { Verdict } from "../../types/Verdict";
import { puckMode } from "../../ui/puckMode";
import { activeTemplates } from "../activeTemplates";
import { removeOwnPuck } from "../removeOwnPuck";
import { tplLongest } from "../tplLongest";
import { addLearnedPuck } from "./addLearnedPuck";
import { assignLearn } from "./assignLearn";
import { learnPoints } from "./learnPoints";
import { learnStamp } from "./learnStamp";
import { nearlyIsosceles } from "./nearlyIsosceles";
import { ownPuckList } from "./ownPuckList";
import { restartLearn } from "./restartLearn";

export function renderLearn(): void {
    const body = el("learnBody"),
        st = el("learnStatus");
    /* Two sentences that differ per mode: in puck mode you don't pick a puck
     from a list but add a new one, and resetting discards your own pucks
     instead of reverting to the blueprint. */
    el("learnIntro").textContent = tr(
        puckMode() ? "recogIntroOwn" : "recogIntro",
    );
    el("btnLearnReset").textContent = tr(
        puckMode() ? "recogResetOwn" : "recogReset",
    );
    if (learn.phase === "saved") {
        const tpl = activeTemplates().find((t) => t.id === learn.tplId);
        if (!tpl) {
            restartLearn();
            return;
        }
        st.innerHTML =
            tr(
                "recogSaved",
                vName(tpl.verdict),
                tpl.ratios[0].toFixed(3),
                tpl.ratios[1].toFixed(3),
                tplLongest(tpl).toFixed(1),
            ) + (learn.clash ? tr("recogClash", learn.clash) : "");
        body.innerHTML = `<div class="row"><button class="primary" id="btnLearnAgain">${tr("recogAgain")}</button></div>`;
        el("btnLearnAgain").onclick = () => restartLearn(true);
        return;
    }
    if (learn.phase === "done" && learn.m) {
        const m = learn.m;
        st.innerHTML = tr(
            "recogMeasured",
            m.r0.toFixed(3),
            m.r1.toFixed(3),
            (m.longest / view.pxPerMM).toFixed(1),
        );
        const iso = nearlyIsosceles(m.r0, m.r1)
            ? `<p class="learn-warn">${tr("recogIso")}</p>`
            : "";
        if (puckMode()) {
            /* No preset. The measurement becomes a new puck; you only say what
         kind it is, and the same kind may occur more than once. */
            body.innerHTML =
                iso +
                `<p class="learn-which">${tr("recogWhichKind")}</p>` +
                VERDICTS.map(
                    (v) =>
                        `<button class="learn-pick" data-verdict="${v.key}" style="--c:${v.color}">
           <b>${vName(v.key)}</b>
           <span>${tr("recogKindCount", templates.own.filter((t) => t.verdict === v.key).length)}</span>
         </button>`,
                ).join("");
            [...body.querySelectorAll<HTMLElement>(".learn-pick")].forEach(
                (b) =>
                    (b.onclick = () =>
                        addLearnedPuck(b.dataset.verdict as Verdict)),
            );
            return;
        }
        body.innerHTML =
            iso +
            `<p class="learn-which">${tr("recogWhich")}</p>` +
            templates.list
                .map(
                    (t) =>
                        `<button class="learn-pick" data-id="${t.id}" style="--c:${vColor(t.verdict)}">
         <b>${vName(t.verdict)}</b>
         <span>${t.id} · ${t.ratios[0].toFixed(3)} / ${t.ratios[1].toFixed(3)} · ${tplLongest(t).toFixed(1)} mm · ${learnStamp(t)}</span>
       </button>`,
                )
                .join("");
        [...body.querySelectorAll<HTMLElement>(".learn-pick")].forEach(
            (b) => (b.onclick = () => assignLearn(b.dataset.id as string)),
        );
        return;
    }
    if (learn.phase === "clear") {
        st.innerHTML = tr("recogLift", learnPoints().length);
        // Anyone who wants to measure the same puck again doesn't need to lift it.
        body.innerHTML = `<div class="row"><button id="btnLearnAnyway">${tr("recogAnyway")}</button></div>`;
        el("btnLearnAnyway").onclick = () => {
            learn.phase = "wait";
            renderLearn();
        };
        return;
    }
    body.innerHTML =
        (learn.note ? `<p class="hint">${learn.note}</p>` : "") +
        (puckMode() ? ownPuckList() : "");
    [...body.querySelectorAll<HTMLElement>(".own-del")].forEach(
        (b) =>
            (b.onclick = () => {
                removeOwnPuck(b.dataset.id as string);
                learn.note = tr("recogRemoved");
                renderLearn();
            }),
    );
    if (learn.phase === "wait")
        st.innerHTML = tr("recogWait", learnPoints().length);
}
