import { CFG } from "../../config/CFG";
import { VERDICTS } from "../../config/VERDICTS";
import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { vName } from "../../i18n/vName";
import { learn } from "../../state/learn";
import { templates } from "../../state/templates";
import { view } from "../../state/view";
import type { Verdict } from "../../types/Verdict";
import { puckMode } from "../../ui/puckMode";
import { activeTemplates } from "../activeTemplates";
import { gapText } from "../geometry/gapText";
import { gapsOf } from "../geometry/gapsOf";
import { isRing } from "../geometry/isRing";
import { ringSelfSym } from "../geometry/ringSelfSym";
import { tplRing } from "../geometry/tplRing";
import { isToolPuck } from "../isToolPuck";
import { removeOwnPuck } from "../removeOwnPuck";
import { tplColor } from "../tplColor";
import { tplLongest } from "../tplLongest";
import { tplName } from "../tplName";
import { tplSummary } from "../tplSummary";
import { addLearnedPuck } from "./addLearnedPuck";
import { assignDuo } from "./assignDuo";
import { assignLearn } from "./assignLearn";
import { learnKnownNote } from "./learnKnownNote";
import { learnPoints } from "./learnPoints";
import { learnStamp } from "./learnStamp";
import { nearlyIsosceles } from "./nearlyIsosceles";
import { ownPuckList } from "./ownPuckList";
import { restartLearn } from "./restartLearn";

const pickRow = (
    id: string,
    color: string,
    name: string,
    sub: string,
): string =>
    `<button class="learn-pick" data-id="${id}" style="--c:${color}">
         <b>${name}</b>
         <span>${sub}</span>
       </button>`;

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
    const again = (): void => {
        body.innerHTML =
            `<div class="row"><button class="primary" id="btnLearnAgain">` +
            `${tr("recogAgain")}</button></div>`;
        el("btnLearnAgain").onclick = () => restartLearn(true);
    };
    if (learn.phase === "saved" && learn.duoSaved) {
        const outer = templates.list.find((t) => t.nest && !isToolPuck(t));
        const inner = templates.list.find((t) => t.nest && isToolPuck(t));
        st.innerHTML = tr(
            "recogSavedDuo",
            tplLongest(outer).toFixed(1),
            tplLongest(inner).toFixed(1),
        );
        again();
        return;
    }
    if (learn.phase === "saved") {
        const tpl = activeTemplates().find((t) => t.id === learn.tplId);
        if (!tpl) {
            restartLearn();
            return;
        }
        st.innerHTML =
            (isRing(tpl)
                ? tr(
                      "recogSavedRing",
                      tplName(tpl),
                      gapText(tpl.angles ?? []),
                      tplRing(tpl).toFixed(1),
                  )
                : tr(
                      "recogSaved",
                      tplName(tpl),
                      (tpl.ratios?.[0] ?? 0).toFixed(3),
                      (tpl.ratios?.[1] ?? 0).toFixed(3),
                      tplLongest(tpl).toFixed(1),
                  )) + (learn.clash ? tr("recogClash", learn.clash) : "");
        again();
        return;
    }
    if (learn.phase === "done" && learn.m?.duo) {
        /* One button, because the duo is one object: both halves at once. */
        const m = learn.m;
        st.innerHTML = tr(
            "recogMeasuredDuo",
            (m.o.longest / view.pxPerMM).toFixed(1),
            (m.i.longest / view.pxPerMM).toFixed(1),
        );
        body.innerHTML = `<p class="learn-which">${tr("recogWhichDuo")}</p>
      <button class="learn-pick" id="btnLearnDuo" style="--c:#7fb2ff">
        <b>${tr("recogPickDuo")}</b>
        <span>${tr("duoTheme")} + ${tr("duoTool")}</span>
      </button>`;
        el("btnLearnDuo").onclick = assignDuo;
        return;
    }
    if (learn.phase === "done" && learn.m && !learn.m.duo) {
        const m = learn.m;
        st.innerHTML = m.ring
            ? tr(
                  "recogMeasuredRing",
                  gapText(m.angles),
                  (m.radius / view.pxPerMM).toFixed(1),
              )
            : tr(
                  "recogMeasured",
                  m.r0.toFixed(3),
                  m.r1.toFixed(3),
                  (m.longest / view.pxPerMM).toFixed(1),
              );
        /* The same warning, two shapes: a triangle without a clear front is
         nearly isosceles, a ring resembles itself after one turn. In both
         cases the ring menu stalls later on. */
        const wobbly = m.ring
            ? ringSelfSym(gapsOf(m.angles)) < CFG.ringToleranceDeg * 1.2
                ? tr("recogRingSym")
                : ""
            : nearlyIsosceles(m.r0, m.r1)
              ? tr("recogIso")
              : "";
        const iso = wobbly ? `<p class="learn-warn">${wobbly}</p>` : "";
        if (puckMode()) {
            /* No preset. The measurement becomes a new puck; you only say
             what kind it is, and the same kind may occur more than once. */
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
            /* The duo doesn't belong to the four kinds: it is one fixed
             object with its own controls. In puck mode every measurement
             normally makes a new own puck, so without these two buttons you
             could only learn the pair here and never one loose half. Only
             for a triangle -- the halves are triangles, and putting a ring
             on one would make the duo into something else. */
            if (!m.ring)
                body.insertAdjacentHTML(
                    "beforeend",
                    `<p class="learn-which">${tr("recogWhichDuoHalf")}</p>` +
                        templates.list
                            .filter((t) => t.nest)
                            .map((t) =>
                                pickRow(
                                    t.id,
                                    tplColor(t),
                                    tplName(t),
                                    `${t.id} · ${tplSummary(t)} · ${learnStamp(t)}`,
                                ),
                            )
                            .join(""),
                );
            [...body.querySelectorAll<HTMLElement>(".learn-pick")].forEach(
                (b) =>
                    (b.onclick = () =>
                        b.dataset.id
                            ? assignLearn(b.dataset.id)
                            : addLearnedPuck(b.dataset.verdict as Verdict)),
            );
            return;
        }
        body.innerHTML =
            iso +
            `<p class="learn-which">${tr("recogWhich")}</p>` +
            templates.list
                .map((t) =>
                    pickRow(
                        t.id,
                        tplColor(t),
                        tplName(t),
                        `${t.id} · ${tplSummary(t)} · ${learnStamp(t)}`,
                    ),
                )
                .join("");
        [...body.querySelectorAll<HTMLElement>(".learn-pick")].forEach(
            (b) => (b.onclick = () => assignLearn(b.dataset.id as string)),
        );
        return;
    }
    if (learn.phase === "clear") {
        st.innerHTML = tr("recogLift", learnPoints().length);
        // Whoever wants to measure the same puck again needn't lift it.
        body.innerHTML =
            `<div class="row"><button id="btnLearnAnyway">` +
            `${tr("recogAnyway")}</button></div>`;
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
        st.innerHTML =
            tr("recogWait", learnPoints().length) + learnKnownNote();
}
