import { L, tr } from "../../i18n";
import { ui } from "../../state";
import type { Template } from "../../types";

/* "learned 3 Sep" or "not learned yet". */
export function learnStamp(t: Template): string {
    if (!t.learnedAt) return tr("recogFactory");
    const d = new Date(t.learnedAt);
    return tr(
        "recogLearned",
        isNaN(d.getTime())
            ? ""
            : d.toLocaleDateString(L[ui.lang].locale as string, {
                  day: "numeric",
                  month: "short",
              }),
    );
}
