import { mdToHtml } from "../dom/mdToHtml";
import { topicLabel } from "../i18n/topicLabel";
import { tr } from "../i18n/tr";
import { vName } from "../i18n/vName";
import { ask } from "../kg/ask";
import { buildQuestion } from "../kg/buildQuestion";
import { kg } from "../kg/kg";
import { nearby } from "../kg/nearby";
import type { NoteView } from "../types/NoteView";
import { notePart } from "./notePart";

/* "Ask for a solution": build the question and let the answer
   stream in. */
export async function askKnowledge(
    v: NoteView | null | undefined,
): Promise<void> {
    const pin = v?.pin;
    if (!pin || !v) return;
    const near = kg.loaded
        ? nearby(pin.lat, pin.lng, { theme: pin.topic, limit: 4 })
        : [];
    const out = notePart(v, "noteAnswer"),
        src = notePart(v, "noteSources");
    out.style.display = "block";
    out.textContent = tr("thinking");
    out.scrollTop = 0;
    src.style.display = "none";
    src.textContent = "";
    /* The box has a fixed height, so the text auto-scrolls along as long as
     nobody has scrolled up themselves. Anyone reading back keeps their place. */
    const atEnd = () =>
        out.scrollHeight - out.scrollTop - out.clientHeight < 24;
    let follow = true;
    out.onscroll = () => {
        follow = atEnd();
    };
    v.askAbort?.abort();
    v.askAbort = new AbortController();
    const question = buildQuestion({
        title: pin.title,
        description: pin.description || pin.note,
        topic: topicLabel(pin.topic),
        verdictName: vName(pin.verdict),
        place: near[0]
            ? near[0].node.label
            : `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`,
        near,
    });
    try {
        await ask(question, {
            signal: v.askAbort.signal,
            onToken: (t) => {
                if (v.pin !== pin) return;
                out.innerHTML = mdToHtml(t);
                if (follow) out.scrollTop = out.scrollHeight;
            },
            onSources: (list) => {
                if (v.pin !== pin || !list.length) return;
                src.style.display = "block";
                src.textContent = tr(
                    "basedOn",
                    [...new Set(list.map((s) => s.title))]
                        .slice(0, 4)
                        .join(" · "),
                );
            },
        });
    } catch (e) {
        const err = e as Error;
        if (err.name !== "AbortError")
            out.textContent = tr("noAnswer", err.message);
    }
}
